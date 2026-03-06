import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { DriversClient } from "./client";

export const metadata: Metadata = {
  title: "Conducteurs",
};

interface DriverData {
  id: string;
  member_id: string;
  vehicle_model: string | null;
  vehicle_color: string | null;
  license_plate: string | null;
  max_passengers: number;
  is_active: boolean;
  members: {
    id: string;
    user_id: string;
    display_name: string | null;
    group_id: string;
  } | {
    id: string;
    user_id: string;
    display_name: string | null;
    group_id: string;
  }[];
}

export default async function DriversPage() {
  const supabase = createServerClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user's member info and group
  const { data: members } = await supabase
    .from("members")
    .select("id, group_id, display_name, is_driver")
    .eq("user_id", user.id)
    .limit(1);

  const currentMember = members?.[0];

  if (!currentMember) {
    redirect("/onboarding");
  }

  // Get all drivers in the group with member info
  const { data: driversData } = await supabase
    .from("drivers")
    .select(`
      id,
      member_id,
      vehicle_model,
      vehicle_color,
      license_plate,
      max_passengers,
      is_active,
      members!inner (
        id,
        user_id,
        display_name,
        group_id
      )
    `)
    .eq("members.group_id", currentMember.group_id);

  // Transform the data to match expected type (members is returned as array, we need object)
  const drivers = ((driversData || []) as DriverData[]).map((d) => ({
    id: d.id,
    member_id: d.member_id,
    vehicle_model: d.vehicle_model,
    vehicle_color: d.vehicle_color,
    license_plate: d.license_plate,
    max_passengers: d.max_passengers,
    is_active: d.is_active,
    members: Array.isArray(d.members) ? d.members[0] : d.members,
  }));

  return (
    <DriversClient
      drivers={drivers}
      currentMember={currentMember}
      userId={user.id}
    />
  );
}
