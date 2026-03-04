import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import webpush from "web-push";

// Configure web-push with VAPID keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:contact@karosse.nc";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

interface SendPushPayload {
  userId?: string;
  userIds?: string[];
  title: string;
  body: string;
  url?: string;
  type?: "trip_reminder" | "trip_update" | "group_invite" | "general";
}

/**
 * POST /api/push/send
 * Send push notification to specific users
 * Admin only endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin in any group
    const { data: memberData } = await supabase
      .from("members")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!memberData) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const payload: SendPushPayload = await request.json();

    if (!payload.title || !payload.body) {
      return NextResponse.json(
        { error: "Title and body are required" },
        { status: 400 }
      );
    }

    // Get target user IDs
    const targetUserIds = payload.userIds || (payload.userId ? [payload.userId] : []);

    if (targetUserIds.length === 0) {
      return NextResponse.json(
        { error: "At least one userId is required" },
        { status: 400 }
      );
    }

    // Get push subscriptions for target users
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", targetUserIds);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      return NextResponse.json(
        { error: "Failed to fetch subscriptions" },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: "No subscriptions found for target users",
      });
    }

    // Send notifications
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || "/calendar",
      type: payload.type || "general",
    });

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
          return { success: true, endpoint: sub.endpoint };
        } catch (error: unknown) {
          const webPushError = error as { statusCode?: number };
          // Handle expired subscriptions
          if (webPushError.statusCode === 410 || webPushError.statusCode === 404) {
            // Delete expired subscription
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("id", sub.id);
            return { success: false, expired: true, endpoint: sub.endpoint };
          }
          throw error;
        }
      })
    );

    const successful = results.filter(
      (r) => r.status === "fulfilled" && (r.value as { success: boolean }).success
    ).length;
    const expired = results.filter(
      (r) => r.status === "fulfilled" && (r.value as { expired?: boolean }).expired
    ).length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({
      success: true,
      sent: successful,
      expired,
      failed,
      total: subscriptions.length,
    });
  } catch (error) {
    console.error("Error in POST /api/push/send:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
