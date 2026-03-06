import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { ProfileClient } from "./client";

export const metadata: Metadata = {
  title: "Profil",
};

export default async function ProfilePage() {
  const supabase = createServerClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get member info with driver status
  const { data: members } = await supabase
    .from("members")
    .select("id, display_name, is_driver, group_id")
    .eq("user_id", user.id)
    .limit(1);

  const member = members?.[0];

  // Get driver info if exists
  let driverId: string | null = null;
  if (member?.is_driver) {
    const { data: driver } = await supabase
      .from("drivers")
      .select("id")
      .eq("member_id", member.id)
      .single();
    driverId = driver?.id || null;
  }

  return (
    <ProfileClient
      user={{
        id: user.id,
        email: user.email || "",
        displayName:
          member?.display_name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.prenom ||
          "Utilisateur",
        phone: user.user_metadata?.telephone || null,
      }}
      isDriver={member?.is_driver || false}
      driverId={driverId}
    />
  );
}
