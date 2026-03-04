import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * POST /api/push
 * Register a new push subscription
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse subscription from body
    const subscription: PushSubscriptionPayload = await request.json();

    if (!subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: "Invalid subscription object" },
        { status: 400 }
      );
    }

    // Upsert subscription
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "endpoint",
      }
    );

    if (error) {
      console.error("Error saving subscription:", error);
      return NextResponse.json(
        { error: "Failed to save subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/push:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/push
 * Remove a push subscription
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get endpoint from body or query
    const { searchParams } = new URL(request.url);
    let endpoint = searchParams.get("endpoint");

    if (!endpoint) {
      try {
        const body = await request.json();
        endpoint = body.endpoint;
      } catch {
        // No body provided
      }
    }

    if (!endpoint) {
      // Delete all subscriptions for this user
      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id);

      if (error) {
        console.error("Error deleting subscriptions:", error);
        return NextResponse.json(
          { error: "Failed to delete subscriptions" },
          { status: 500 }
        );
      }
    } else {
      // Delete specific subscription
      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", endpoint)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error deleting subscription:", error);
        return NextResponse.json(
          { error: "Failed to delete subscription" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/push:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/push
 * Check if user has active push subscriptions
 */
export async function GET() {
  try {
    const supabase = createServerClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user's subscriptions
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, created_at, updated_at")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching subscriptions:", error);
      return NextResponse.json(
        { error: "Failed to fetch subscriptions" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      subscribed: subscriptions && subscriptions.length > 0,
      count: subscriptions?.length || 0,
      subscriptions: subscriptions?.map((s) => ({
        id: s.id,
        endpoint: s.endpoint.substring(0, 50) + "...",
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      })),
    });
  } catch (error) {
    console.error("Error in GET /api/push:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
