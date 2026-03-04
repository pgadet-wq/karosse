/**
 * KAROSSE - Send Reminder Edge Function
 *
 * This function runs daily via cron at 08:00 UTC (19:00 Nouméa)
 * It sends push notifications to drivers who have trips planned for tomorrow
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

// VAPID configuration
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:contact@karosse.nc";

// Nouméa timezone offset (UTC+11)
const NOUMEA_OFFSET_HOURS = 11;

interface Trip {
  id: string;
  date: string;
  direction: string;
  departure_time: string | null;
  group_id: string;
  driver_id: string;
  drivers: {
    id: string;
    member_id: string;
    members: {
      id: string;
      user_id: string;
      display_name: string | null;
    };
  };
  groups: {
    id: string;
    name: string;
    school_name: string | null;
  };
}

interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface NotificationLog {
  trip_id: string;
  user_id: string;
  status: "sent" | "failed" | "expired";
  error?: string;
}

/**
 * Get tomorrow's date in Nouméa timezone (YYYY-MM-DD format)
 */
function getTomorrowInNoumea(): string {
  const now = new Date();
  // Add Nouméa offset to get local time
  const noumeaTime = new Date(now.getTime() + NOUMEA_OFFSET_HOURS * 60 * 60 * 1000);
  // Add one day for tomorrow
  noumeaTime.setDate(noumeaTime.getDate() + 1);
  // Format as YYYY-MM-DD
  return noumeaTime.toISOString().split("T")[0];
}

/**
 * Count children in the group (simplified - counts all children)
 */
async function countGroupChildren(
  supabase: ReturnType<typeof createClient>,
  groupId: string
): Promise<number> {
  const { data: members } = await supabase
    .from("members")
    .select("id")
    .eq("group_id", groupId);

  if (!members || members.length === 0) return 0;

  const memberIds = members.map((m: { id: string }) => m.id);

  const { count } = await supabase
    .from("children")
    .select("*", { count: "exact", head: true })
    .in("member_id", memberIds);

  return count || 0;
}

/**
 * Build notification message for a trip
 */
function buildNotificationMessage(
  trip: Trip,
  childrenCount: number
): { title: string; body: string } {
  const isAller = trip.direction === "to_school";
  const schoolName = trip.groups.school_name || "l'école";
  const time = trip.departure_time
    ? trip.departure_time.substring(0, 5)
    : isAller
    ? "07:30"
    : "16:30";

  if (isAller) {
    return {
      title: "Rappel trajet demain matin",
      body: `Demain matin, c'est vous ! Départ à ${time}, ${childrenCount} enfant${childrenCount > 1 ? "s" : ""} à conduire au ${schoolName}.`,
    };
  } else {
    return {
      title: "Rappel trajet demain soir",
      body: `Demain soir, c'est vous ! Récupération à ${time} au ${schoolName}, ${childrenCount} enfant${childrenCount > 1 ? "s" : ""}.`,
    };
  }
}

/**
 * Send a push notification using Web Push protocol
 * This is a simplified implementation - for production, use a proper web-push library
 */
async function sendPushNotification(
  subscription: PushSubscription,
  payload: { title: string; body: string; url?: string; type?: string }
): Promise<{ success: boolean; expired?: boolean; error?: string }> {
  try {
    // For Deno, we need to implement the Web Push protocol manually
    // or use a Deno-compatible library

    // This is a placeholder implementation
    // In production, you would use the web-push protocol with JWT signing

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "TTL": "86400", // 24 hours
        // Authorization header would need JWT signing with VAPID keys
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 201 || response.status === 200) {
      return { success: true };
    }

    if (response.status === 410 || response.status === 404) {
      // Subscription expired or not found
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
 * Main handler function
 */
serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get tomorrow's date in Nouméa timezone
    const tomorrowDate = getTomorrowInNoumea();
    console.log(`Processing reminders for: ${tomorrowDate}`);

    // Fetch trips for tomorrow with driver info
    const { data: trips, error: tripsError } = await supabase
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
      .in("status", ["planned", "confirmed"])
      .not("driver_id", "is", null);

    if (tripsError) {
      console.error("Error fetching trips:", tripsError);
      throw tripsError;
    }

    if (!trips || trips.length === 0) {
      console.log("No trips found for tomorrow");
      return new Response(
        JSON.stringify({ message: "No trips to process", date: tomorrowDate }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${trips.length} trips for tomorrow`);

    const logs: NotificationLog[] = [];
    let sentCount = 0;
    let failedCount = 0;
    let expiredCount = 0;

    // Process each trip
    for (const trip of trips as unknown as Trip[]) {
      const userId = trip.drivers?.members?.user_id;
      if (!userId) {
        console.log(`Trip ${trip.id}: No user_id found for driver`);
        continue;
      }

      // Get push subscriptions for this user
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", userId);

      if (!subscriptions || subscriptions.length === 0) {
        console.log(`Trip ${trip.id}: No push subscriptions for user ${userId}`);
        continue;
      }

      // Count children in the group
      const childrenCount = await countGroupChildren(supabase, trip.group_id);

      // Build notification message
      const { title, body } = buildNotificationMessage(trip, childrenCount);

      const payload = {
        title,
        body,
        url: `/calendar?date=${trip.date}`,
        type: "trip_reminder",
      };

      // Send to all subscriptions for this user
      for (const subscription of subscriptions as PushSubscription[]) {
        const result = await sendPushNotification(subscription, payload);

        if (result.success) {
          sentCount++;
          logs.push({ trip_id: trip.id, user_id: userId, status: "sent" });
        } else if (result.expired) {
          expiredCount++;
          // Delete expired subscription
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", subscription.id);
          logs.push({
            trip_id: trip.id,
            user_id: userId,
            status: "expired",
            error: "Subscription expired",
          });
        } else {
          failedCount++;
          logs.push({
            trip_id: trip.id,
            user_id: userId,
            status: "failed",
            error: result.error,
          });
        }
      }
    }

    // Log results
    console.log(`Results: ${sentCount} sent, ${failedCount} failed, ${expiredCount} expired`);

    // Optionally save logs to database
    // await supabase.from("notification_logs").insert(logs);

    return new Response(
      JSON.stringify({
        success: true,
        date: tomorrowDate,
        tripsProcessed: trips.length,
        notificationsSent: sentCount,
        notificationsFailed: failedCount,
        subscriptionsExpired: expiredCount,
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
