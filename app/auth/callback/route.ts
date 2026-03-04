import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = createServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if user has a member profile in any group
      const { data: member } = await supabase
        .from("members")
        .select("id")
        .eq("user_id", data.user.id)
        .limit(1)
        .single();

      if (member) {
        // User has a profile, go to calendar or specified next
        return NextResponse.redirect(`${origin}${next || "/calendar"}`);
      } else {
        // New user, needs onboarding
        return NextResponse.redirect(`${origin}/onboarding`);
      }
    }
  }

  // Return the user to login page with error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
