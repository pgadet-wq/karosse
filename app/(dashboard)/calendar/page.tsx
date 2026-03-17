import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getActiveGroupMember } from "@/lib/active-group";
import { CalendarClient } from "./client";

export const metadata: Metadata = {
  title: "Calendrier",
};

interface TripData {
  id: string;
  date: string;
  direction: string;
  status: string;
  departure_time: string | null;
  available_seats: number;
  drivers: {
    id: string;
    member_id: string;
    vehicle_model: string | null;
    vehicle_color: string | null;
    max_passengers: number;
    members: {
      id: string;
      display_name: string | null;
    } | {
      id: string;
      display_name: string | null;
    }[];
  } | null;
  trip_passengers: {
    id: string;
    status: string;
    children: {
      id: string;
      first_name: string;
      last_name: string | null;
    };
  }[];
}

interface DriverData {
  id: string;
  member_id: string;
  vehicle_model: string | null;
  vehicle_color: string | null;
  max_passengers: number;
  available_days: string[];
  members: {
    id: string;
    display_name: string | null;
  } | {
    id: string;
    display_name: string | null;
  }[];
}

interface ChildData {
  id: string;
  first_name: string;
  last_name: string | null;
}

export default async function CalendarPage() {
  const supabase = createServerClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user's active group member
  const currentMember = await getActiveGroupMember(supabase, user.id);

  if (!currentMember) {
    redirect("/onboarding");
  }

  // Get trips for the group
  const { data: tripsData } = await supabase
    .from("trips")
    .select(`
      id,
      date,
      direction,
      status,
      departure_time,
      available_seats,
      drivers (
        id,
        member_id,
        vehicle_model,
        vehicle_color,
        max_passengers,
        members (
          id,
          display_name
        )
      ),
      trip_passengers (
        id,
        status,
        children (
          id,
          first_name,
          last_name
        )
      )
    `)
    .eq("group_id", currentMember.group_id)
    .neq("status", "cancelled")
    .order("date", { ascending: true });

  // Transform trips data
  const trips = ((tripsData || []) as unknown as TripData[]).map((t) => {
    const driver = t.drivers;
    const driverMembers = driver?.members;
    const memberData = driverMembers
      ? (Array.isArray(driverMembers) ? driverMembers[0] : driverMembers)
      : null;

    return {
      id: t.id,
      date: t.date,
      direction: t.direction === "to_school" ? "aller" : "retour" as "aller" | "retour",
      status: (t.status || "unassigned") as "confirmed" | "planned" | "cancelled" | "unassigned",
      departure_time: t.departure_time,
      available_seats: t.available_seats,
      driver: driver ? {
        id: driver.id,
        member_id: driver.member_id,
        display_name: memberData?.display_name || null,
        vehicle_model: driver.vehicle_model,
        vehicle_color: driver.vehicle_color,
        max_passengers: driver.max_passengers,
      } : undefined,
      passengers: (t.trip_passengers || []).map((p) => ({
        id: p.id,
        status: p.status as "confirmed" | "pending" | "cancelled",
        child: {
          id: p.children.id,
          first_name: p.children.first_name,
          last_name: p.children.last_name,
        },
      })),
    };
  });

  // Get all drivers in the group (with available_days for planning)
  const { data: driversData } = await supabase
    .from("drivers")
    .select(`
      id,
      member_id,
      vehicle_model,
      vehicle_color,
      max_passengers,
      available_days,
      members!inner (
        id,
        display_name,
        group_id
      )
    `)
    .eq("members.group_id", currentMember.group_id)
    .eq("is_active", true);

  const drivers = ((driversData || []) as unknown as DriverData[]).map((d) => {
    const member = Array.isArray(d.members) ? d.members[0] : d.members;
    return {
      id: d.id,
      member_id: d.member_id,
      display_name: member?.display_name || null,
      vehicle_model: d.vehicle_model,
      vehicle_color: d.vehicle_color,
      max_passengers: d.max_passengers,
      available_days: d.available_days || [],
    };
  });

  // Get all children in the group
  const { data: membersInGroup } = await supabase
    .from("members")
    .select("id")
    .eq("group_id", currentMember.group_id);

  const memberIds = membersInGroup?.map((m) => m.id) || [];

  const { data: childrenData } = await supabase
    .from("children")
    .select("id, first_name, last_name")
    .in("member_id", memberIds);

  const groupChildren: ChildData[] = (childrenData || []).map((c) => ({
    id: c.id,
    first_name: c.first_name,
    last_name: c.last_name,
  }));

  // Raw trips for planning view (simpler format)
  const rawTrips = ((tripsData || []) as unknown as TripData[]).map((t) => ({
    id: t.id,
    date: t.date,
    direction: t.direction,
    driver_id: t.drivers?.id || null,
    status: t.status,
  }));

  return (
    <CalendarClient
      trips={trips}
      drivers={drivers}
      groupChildren={groupChildren}
      groupId={currentMember.group_id}
      rawTrips={rawTrips}
    />
  );
}
