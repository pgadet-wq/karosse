import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import webpush from "web-push";

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

interface NotifyGroupPayload {
  groupId: string;
  type: "driver_removed" | "child_removed" | "trip_cancelled" | "driver_assigned" | "trip_confirmed" | "unassigned_reminder" | "planning_updated";
  tripDate: string;
  tripDirection: string;
  driverName?: string;
  childName?: string;
}

// Map notification event types to preference keys
function getPreferenceKey(type: NotifyGroupPayload["type"]): string {
  switch (type) {
    case "trip_confirmed":
      return "trip_confirmed";
    case "unassigned_reminder":
      return "unassigned_reminder";
    default:
      // driver_removed, child_removed, trip_cancelled, driver_assigned
      return "trip_update";
  }
}

/**
 * POST /api/push/notify-group
 * Notify all members in a group about trip changes, respecting notification preferences
 */
export async function POST(request: NextRequest) {
  try {
    // Configure VAPID on first request
    if (!configureVapid()) {
      return NextResponse.json(
        { error: "Push notifications not configured" },
        { status: 503 }
      );
    }

    const supabase = createServerClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is member of the group
    const payload: NotifyGroupPayload = await request.json();

    const { data: memberData } = await supabase
      .from("members")
      .select("id, group_id")
      .eq("user_id", user.id)
      .eq("group_id", payload.groupId)
      .single();

    if (!memberData) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
    }

    // Get all members in the group with their user IDs and notification preferences
    const { data: groupMembers } = await supabase
      .from("members")
      .select("id, user_id, notification_preferences")
      .eq("group_id", payload.groupId);

    if (!groupMembers || groupMembers.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: "No members in group",
      });
    }

    // Filter members by notification preference for this event type
    const prefKey = getPreferenceKey(payload.type);
    const eligibleMembers = groupMembers.filter((m) => {
      // Exclude the user who triggered the action
      if (m.user_id === user.id) return false;
      // Check notification preference (default to true if not set)
      const prefs = m.notification_preferences as Record<string, boolean> | null;
      if (!prefs) return true; // No preferences = all enabled
      return prefs[prefKey] !== false;
    });

    const memberUserIds = eligibleMembers
      .map((m) => m.user_id)
      .filter((id): id is string => id !== null);

    if (memberUserIds.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: "No eligible members to notify",
      });
    }

    // Get push subscriptions for eligible members
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", memberUserIds);

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: "No subscriptions found for members",
      });
    }

    // Build notification message
    const directionLabel = payload.tripDirection === "to_school" ? "aller" : "retour";
    const dateFormatted = new Date(payload.tripDate).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    let title = "";
    let body = "";

    switch (payload.type) {
      case "driver_removed":
        title = "Conducteur recherché";
        body = `${payload.driverName || "Un conducteur"} s'est retiré du trajet ${directionLabel} du ${dateFormatted}. Pouvez-vous assurer ce trajet ?`;
        break;
      case "child_removed":
        title = "Passager retiré";
        body = `${payload.childName || "Un enfant"} a été retiré du trajet ${directionLabel} du ${dateFormatted}.`;
        break;
      case "trip_cancelled":
        title = "Trajet annulé";
        body = `Le trajet ${directionLabel} du ${dateFormatted} a été annulé.`;
        break;
      case "driver_assigned":
        title = "Conducteur assigné";
        body = `${payload.driverName || "Un conducteur"} assure le trajet ${directionLabel} du ${dateFormatted}.`;
        break;
      case "trip_confirmed":
        title = "Trajet confirmé";
        body = `Le trajet ${directionLabel} du ${dateFormatted} est confirmé.`;
        break;
      case "unassigned_reminder":
        title = "Trajet sans conducteur";
        body = `Le trajet ${directionLabel} de demain (${dateFormatted}) n'a pas de conducteur. Pouvez-vous assurer ce trajet ?`;
        break;
      case "planning_updated":
        title = "Planning mis à jour";
        body = `La semaine du ${dateFormatted} a été planifiée. Consultez le calendrier pour voir les trajets.`;
        break;
    }

    const notificationPayload = JSON.stringify({
      title,
      body,
      url: `/calendar?date=${payload.tripDate}`,
      type: payload.type === "unassigned_reminder" ? "trip_reminder" : "trip_update",
    });

    // Send notifications
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            notificationPayload
          );
          return { success: true };
        } catch (error: unknown) {
          const webPushError = error as { statusCode?: number };
          if (webPushError.statusCode === 410 || webPushError.statusCode === 404) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("id", sub.id);
            return { success: false, expired: true };
          }
          throw error;
        }
      })
    );

    const successful = results.filter(
      (r) => r.status === "fulfilled" && (r.value as { success: boolean }).success
    ).length;

    return NextResponse.json({
      success: true,
      sent: successful,
      total: subscriptions.length,
    });
  } catch (error) {
    console.error("Error in POST /api/push/notify-group:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
