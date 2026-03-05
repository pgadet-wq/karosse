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
  type: "driver_removed" | "child_removed" | "trip_cancelled";
  tripDate: string;
  tripDirection: string;
  driverName?: string;
  childName?: string;
}

/**
 * POST /api/push/notify-group
 * Notify all drivers in a group about trip changes
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

    // Get all drivers in the group with their user IDs
    const { data: groupDrivers } = await supabase
      .from("drivers")
      .select(`
        id,
        members!inner (
          id,
          user_id,
          group_id
        )
      `)
      .eq("members.group_id", payload.groupId)
      .eq("is_active", true);

    if (!groupDrivers || groupDrivers.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: "No drivers in group",
      });
    }

    // Extract user IDs (excluding the current user who triggered the action)
    const driverUserIds = groupDrivers
      .map((d) => {
        const member = d.members as unknown as { user_id: string };
        return member?.user_id;
      })
      .filter((id): id is string => id !== null && id !== user.id);

    if (driverUserIds.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: "No other drivers to notify",
      });
    }

    // Get push subscriptions for drivers
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", driverUserIds);

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: "No subscriptions found for drivers",
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
    }

    const notificationPayload = JSON.stringify({
      title,
      body,
      url: `/calendar?date=${payload.tripDate}`,
      type: "trip_update",
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
