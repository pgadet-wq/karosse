import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { addDays, format } from "date-fns";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

let vapidConfigured = false;

function configureVapid() {
  if (vapidConfigured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:contact@karosse.nc";

  if (!publicKey || !privateKey) {
    console.error("VAPID keys not configured");
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

interface TripRow {
  id: string;
  group_id: string;
  date: string;
  direction: string;
  status: string;
  departure_time: string | null;
  driver_id: string | null;
  drivers: {
    members: { display_name: string | null } | { display_name: string | null }[];
  } | null;
}

async function sendToSubscriptions(
  supabase: ReturnType<typeof createServiceClient>,
  subscriptions: { id: string; endpoint: string; p256dh: string; auth: string }[],
  payload: string
) {
  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        return { success: true };
      } catch (error: unknown) {
        const webPushError = error as { statusCode?: number };
        if (webPushError.statusCode === 410 || webPushError.statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          return { success: false, expired: true };
        }
        throw error;
      }
    })
  );

  return results.filter(
    (r) => r.status === "fulfilled" && (r.value as { success: boolean }).success
  ).length;
}

/**
 * POST /api/push/daily-reminder
 * Daily cron: sends reminders for ALL trips scheduled tomorrow.
 * - Trips with driver: "Rappel: trajet demain avec [conducteur]"
 * - Trips without driver: "Trajet sans conducteur demain"
 * Respects notification preferences (trip_reminder + unassigned_reminder).
 */
export async function POST(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!configureVapid()) {
      return NextResponse.json(
        { error: "Push notifications not configured" },
        { status: 503 }
      );
    }

    const supabase = createServiceClient();
    const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");

    // Check if tomorrow is a school day
    const { data: calendarDay } = await supabase
      .from("school_calendar")
      .select("is_school_day")
      .eq("date", tomorrow)
      .single();

    if (calendarDay && !calendarDay.is_school_day) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: "Tomorrow is not a school day",
      });
    }

    // Fetch ALL trips for tomorrow (not cancelled)
    const { data: allTrips } = await supabase
      .from("trips")
      .select(`
        id, group_id, date, direction, status, departure_time, driver_id,
        drivers ( members ( display_name ) )
      `)
      .eq("date", tomorrow)
      .neq("status", "cancelled");

    if (!allTrips || allTrips.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: "No trips for tomorrow",
      });
    }

    const trips = allTrips as unknown as TripRow[];

    // Group trips by group_id
    const tripsByGroup = new Map<string, TripRow[]>();
    for (const trip of trips) {
      const existing = tripsByGroup.get(trip.group_id) || [];
      existing.push(trip);
      tripsByGroup.set(trip.group_id, existing);
    }

    let totalSent = 0;
    const dateFormatted = new Date(tomorrow).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    const groupIds = Array.from(tripsByGroup.keys());
    for (const groupId of groupIds) {
      const groupTrips = tripsByGroup.get(groupId)!;
      // Get all members with preferences
      const { data: members } = await supabase
        .from("members")
        .select("user_id, notification_preferences")
        .eq("group_id", groupId);

      if (!members || members.length === 0) continue;

      // Split trips into assigned and unassigned
      const assignedTrips = groupTrips.filter((t: TripRow) => t.driver_id !== null);
      const unassignedTrips = groupTrips.filter((t: TripRow) => t.driver_id === null);

      // --- 1. Assigned trip reminders (trip_reminder preference) ---
      if (assignedTrips.length > 0) {
        const eligibleUserIds = members
          .filter((m) => {
            const prefs = m.notification_preferences as Record<string, boolean> | null;
            if (!prefs) return true;
            return prefs.trip_reminder !== false;
          })
          .map((m) => m.user_id)
          .filter((id): id is string => id !== null);

        if (eligibleUserIds.length > 0) {
          const { data: subscriptions } = await supabase
            .from("push_subscriptions")
            .select("id, endpoint, p256dh, auth")
            .in("user_id", eligibleUserIds);

          if (subscriptions && subscriptions.length > 0) {
            // Build message for assigned trips
            const tripLines = assignedTrips.map((t: TripRow) => {
              const dir = t.direction === "to_school" ? "Aller" : "Retour";
              const driverMembers = t.drivers?.members;
              const member = driverMembers
                ? (Array.isArray(driverMembers) ? driverMembers[0] : driverMembers)
                : null;
              const driverName = member?.display_name || "conducteur assigné";
              const time = t.departure_time ? ` à ${t.departure_time.slice(0, 5)}` : "";
              return `${dir}${time} — ${driverName}`;
            });

            const payload = JSON.stringify({
              title: `Trajet demain (${dateFormatted})`,
              body: tripLines.join("\n"),
              url: `/calendar?date=${tomorrow}`,
              type: "trip_reminder",
            });

            totalSent += await sendToSubscriptions(supabase, subscriptions, payload);
          }
        }
      }

      // --- 2. Unassigned trip reminders (unassigned_reminder preference) ---
      if (unassignedTrips.length > 0) {
        const eligibleUserIds = members
          .filter((m) => {
            const prefs = m.notification_preferences as Record<string, boolean> | null;
            if (!prefs) return true;
            return prefs.unassigned_reminder !== false;
          })
          .map((m) => m.user_id)
          .filter((id): id is string => id !== null);

        if (eligibleUserIds.length > 0) {
          const { data: subscriptions } = await supabase
            .from("push_subscriptions")
            .select("id, endpoint, p256dh, auth")
            .in("user_id", eligibleUserIds);

          if (subscriptions && subscriptions.length > 0) {
            const directions = unassignedTrips.map((t: TripRow) =>
              t.direction === "to_school" ? "aller" : "retour"
            );
            const directionText = Array.from(new Set(directions)).join(" et ");

            const payload = JSON.stringify({
              title: "Conducteur recherché pour demain",
              body: `Le trajet ${directionText} du ${dateFormatted} n'a pas de conducteur. Pouvez-vous assurer ce trajet ?`,
              url: `/calendar?date=${tomorrow}`,
              type: "trip_reminder",
            });

            totalSent += await sendToSubscriptions(supabase, subscriptions, payload);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      sent: totalSent,
      tripsChecked: trips.length,
    });
  } catch (error) {
    console.error("Error in POST /api/push/daily-reminder:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
