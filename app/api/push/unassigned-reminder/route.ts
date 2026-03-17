import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import webpush from "web-push";
import { addDays, format } from "date-fns";

// Lazy initialization flag
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

/**
 * POST /api/push/unassigned-reminder
 * Sends reminders for trips without a driver scheduled for tomorrow.
 * Intended to be called by a cron job daily.
 * Requires CRON_SECRET header for authorization.
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

    const supabase = createServerClient();
    const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");

    // Find all trips for tomorrow that have no driver
    const { data: unassignedTrips } = await supabase
      .from("trips")
      .select("id, group_id, date, direction, status")
      .eq("date", tomorrow)
      .is("driver_id", null)
      .in("status", ["planned", "unassigned"]);

    if (!unassignedTrips || unassignedTrips.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: "No unassigned trips for tomorrow",
      });
    }

    // Group trips by group_id to send one notification per group
    const tripsByGroup = new Map<string, typeof unassignedTrips>();
    for (const trip of unassignedTrips) {
      const existing = tripsByGroup.get(trip.group_id) || [];
      existing.push(trip);
      tripsByGroup.set(trip.group_id, existing);
    }

    let totalSent = 0;

    const groupIds = Array.from(tripsByGroup.keys());
    for (const groupId of groupIds) {
      const trips = tripsByGroup.get(groupId)!;
      // Get members who have unassigned_reminder enabled
      const { data: members } = await supabase
        .from("members")
        .select("user_id, notification_preferences")
        .eq("group_id", groupId);

      if (!members || members.length === 0) continue;

      const eligibleUserIds = members
        .filter((m) => {
          const prefs = m.notification_preferences as Record<string, boolean> | null;
          if (!prefs) return true;
          return prefs.unassigned_reminder !== false;
        })
        .map((m) => m.user_id)
        .filter((id): id is string => id !== null);

      if (eligibleUserIds.length === 0) continue;

      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("*")
        .in("user_id", eligibleUserIds);

      if (!subscriptions || subscriptions.length === 0) continue;

      // Build message
      const dateFormatted = new Date(tomorrow).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });

      const directions = trips.map((t) =>
        t.direction === "to_school" ? "aller" : "retour"
      );
      const directionText = directions.join(" et ");

      const notificationPayload = JSON.stringify({
        title: "Trajet sans conducteur",
        body: `Le trajet ${directionText} de demain (${dateFormatted}) n'a pas de conducteur. Pouvez-vous assurer ce trajet ?`,
        url: `/calendar?date=${tomorrow}`,
        type: "trip_reminder",
      });

      const results = await Promise.allSettled(
        subscriptions.map(async (sub) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              notificationPayload
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

      totalSent += results.filter(
        (r) => r.status === "fulfilled" && (r.value as { success: boolean }).success
      ).length;
    }

    return NextResponse.json({
      success: true,
      sent: totalSent,
      tripsChecked: unassignedTrips.length,
    });
  } catch (error) {
    console.error("Error in POST /api/push/unassigned-reminder:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
