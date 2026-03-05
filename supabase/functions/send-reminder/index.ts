/**
 * KAROSSE - Send Reminder Edge Function
 *
 * This function runs daily via cron at 08:00 UTC (19:00 Nouméa)
 * It sends push notifications for:
 * 1. Trips without assigned driver -> alert all group drivers
 * 2. Trips not confirmed by driver -> alert the assigned driver
 *
 * Environment variables required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - VAPID_PUBLIC_KEY
 * - VAPID_PRIVATE_KEY
 * - VAPID_SUBJECT
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Nouméa timezone offset (UTC+11)
const NOUMEA_OFFSET_HOURS = 11;

interface Trip {
  id: string;
  date: string;
  direction: string;
  status: string;
  departure_time: string | null;
  group_id: string;
  driver_id: string | null;
  drivers: {
    id: string;
    member_id: string;
    members: {
      id: string;
      user_id: string;
      display_name: string | null;
    };
  } | null;
  groups: {
    id: string;
    name: string;
    school_name: string | null;
  };
}

interface Driver {
  id: string;
  member_id: string;
  members: {
    id: string;
    user_id: string;
    display_name: string | null;
  };
}

interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Get tomorrow's date in Nouméa timezone (YYYY-MM-DD format)
 */
function getTomorrowInNoumea(): string {
  const now = new Date();
  const noumeaTime = new Date(now.getTime() + NOUMEA_OFFSET_HOURS * 60 * 60 * 1000);
  noumeaTime.setDate(noumeaTime.getDate() + 1);
  return noumeaTime.toISOString().split("T")[0];
}

/**
 * Send a push notification
 */
async function sendPushNotification(
  subscription: PushSubscription,
  payload: { title: string; body: string; url?: string; type?: string }
): Promise<{ success: boolean; expired?: boolean; error?: string }> {
  try {
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "TTL": "86400",
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 201 || response.status === 200) {
      return { success: true };
    }

    if (response.status === 410 || response.status === 404) {
      return { success: false, expired: true };
    }

    return {
      success: false,
      error: `HTTP ${response.status}: ${response.statusText}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send notification to a user
 */
async function notifyUser(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  payload: { title: string; body: string; url?: string; type?: string }
): Promise<{ sent: number; failed: number; expired: number }> {
  const result = { sent: 0, failed: 0, expired: 0 };

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (!subscriptions || subscriptions.length === 0) {
    return result;
  }

  for (const subscription of subscriptions as PushSubscription[]) {
    const sendResult = await sendPushNotification(subscription, payload);

    if (sendResult.success) {
      result.sent++;
    } else if (sendResult.expired) {
      result.expired++;
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("id", subscription.id);
    } else {
      result.failed++;
    }
  }

  return result;
}

/**
 * Main handler function
 */
serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const tomorrowDate = getTomorrowInNoumea();
    console.log(`Processing reminders for: ${tomorrowDate}`);

    let totalSent = 0;
    let totalFailed = 0;
    let totalExpired = 0;

    // ========================================================================
    // 1. TRIPS WITHOUT DRIVER - Alert all group drivers
    // ========================================================================
    const { data: unassignedTrips } = await supabase
      .from("trips")
      .select(`
        id,
        date,
        direction,
        group_id,
        groups (
          id,
          name,
          school_name
        )
      `)
      .eq("date", tomorrowDate)
      .is("driver_id", null);

    if (unassignedTrips && unassignedTrips.length > 0) {
      console.log(`Found ${unassignedTrips.length} trips without driver`);

      for (const trip of unassignedTrips as unknown as Trip[]) {
        // Get all drivers in this group
        const { data: groupDrivers } = await supabase
          .from("drivers")
          .select(`
            id,
            member_id,
            members!inner (
              id,
              user_id,
              display_name,
              group_id
            )
          `)
          .eq("members.group_id", trip.group_id)
          .eq("is_active", true);

        if (!groupDrivers || groupDrivers.length === 0) {
          console.log(`Trip ${trip.id}: No drivers in group`);
          continue;
        }

        const isAller = trip.direction === "to_school";
        const directionLabel = isAller ? "aller (matin)" : "retour (soir)";
        const schoolName = trip.groups?.school_name || "l'école";

        const payload = {
          title: "Conducteur recherché pour demain",
          body: `Le trajet ${directionLabel} vers ${schoolName} n'a pas de conducteur assigné. Pouvez-vous assurer ce trajet ?`,
          url: `/calendar?date=${trip.date}`,
          type: "unassigned_trip",
        };

        // Notify all drivers in the group
        for (const driver of groupDrivers as unknown as Driver[]) {
          const userId = driver.members?.user_id;
          if (!userId) continue;

          const result = await notifyUser(supabase, userId, payload);
          totalSent += result.sent;
          totalFailed += result.failed;
          totalExpired += result.expired;
        }
      }
    }

    // ========================================================================
    // 2. TRIPS NOT CONFIRMED - Alert the assigned driver
    // ========================================================================
    const { data: unconfirmedTrips } = await supabase
      .from("trips")
      .select(`
        id,
        date,
        direction,
        departure_time,
        group_id,
        driver_id,
        drivers (
          id,
          member_id,
          members (
            id,
            user_id,
            display_name
          )
        ),
        groups (
          id,
          name,
          school_name
        )
      `)
      .eq("date", tomorrowDate)
      .eq("status", "planned")
      .not("driver_id", "is", null);

    if (unconfirmedTrips && unconfirmedTrips.length > 0) {
      console.log(`Found ${unconfirmedTrips.length} unconfirmed trips`);

      for (const trip of unconfirmedTrips as unknown as Trip[]) {
        const userId = trip.drivers?.members?.user_id;
        if (!userId) {
          console.log(`Trip ${trip.id}: No user_id found for driver`);
          continue;
        }

        const isAller = trip.direction === "to_school";
        const directionLabel = isAller ? "aller (matin)" : "retour (soir)";
        const schoolName = trip.groups?.school_name || "l'école";
        const time = trip.departure_time
          ? trip.departure_time.substring(0, 5)
          : isAller ? "07:30" : "16:30";

        const payload = {
          title: "Confirmez votre trajet de demain",
          body: `Vous êtes assigné au trajet ${directionLabel} vers ${schoolName} à ${time}. Merci de confirmer votre disponibilité.`,
          url: `/calendar?date=${trip.date}`,
          type: "confirm_reminder",
        };

        const result = await notifyUser(supabase, userId, payload);
        totalSent += result.sent;
        totalFailed += result.failed;
        totalExpired += result.expired;
      }
    }

    // ========================================================================
    // 3. CONFIRMED TRIPS - Reminder for drivers (optional info)
    // ========================================================================
    const { data: confirmedTrips } = await supabase
      .from("trips")
      .select(`
        id,
        date,
        direction,
        departure_time,
        group_id,
        driver_id,
        drivers (
          id,
          member_id,
          members (
            id,
            user_id,
            display_name
          )
        ),
        groups (
          id,
          name,
          school_name
        )
      `)
      .eq("date", tomorrowDate)
      .eq("status", "confirmed")
      .not("driver_id", "is", null);

    if (confirmedTrips && confirmedTrips.length > 0) {
      console.log(`Found ${confirmedTrips.length} confirmed trips`);

      for (const trip of confirmedTrips as unknown as Trip[]) {
        const userId = trip.drivers?.members?.user_id;
        if (!userId) continue;

        const isAller = trip.direction === "to_school";
        const schoolName = trip.groups?.school_name || "l'école";
        const time = trip.departure_time
          ? trip.departure_time.substring(0, 5)
          : isAller ? "07:30" : "16:30";

        const payload = {
          title: isAller ? "Rappel trajet demain matin" : "Rappel trajet demain soir",
          body: isAller
            ? `Demain matin, c'est vous ! Départ à ${time} vers ${schoolName}.`
            : `Demain soir, c'est vous ! Récupération à ${time} au ${schoolName}.`,
          url: `/calendar?date=${trip.date}`,
          type: "trip_reminder",
        };

        const result = await notifyUser(supabase, userId, payload);
        totalSent += result.sent;
        totalFailed += result.failed;
        totalExpired += result.expired;
      }
    }

    console.log(`Results: ${totalSent} sent, ${totalFailed} failed, ${totalExpired} expired`);

    return new Response(
      JSON.stringify({
        success: true,
        date: tomorrowDate,
        unassignedTrips: unassignedTrips?.length || 0,
        unconfirmedTrips: unconfirmedTrips?.length || 0,
        confirmedTrips: confirmedTrips?.length || 0,
        notificationsSent: totalSent,
        notificationsFailed: totalFailed,
        subscriptionsExpired: totalExpired,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-reminder function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
