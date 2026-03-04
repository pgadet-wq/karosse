import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase/server";
import { GroupClient } from "./client";

export const metadata: Metadata = {
  title: "Groupe",
};

interface ChildData {
  id: string;
  member_id: string;
  first_name: string;
  last_name: string | null;
  grade: string | null;
  notes: string | null;
  members: {
    id: string;
    display_name: string | null;
  } | {
    id: string;
    display_name: string | null;
  }[];
}

export default async function GroupPage() {
  const supabase = createServerClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get user's member info
  const { data: currentMember } = await supabase
    .from("members")
    .select("id, group_id, display_name, role")
    .eq("user_id", user.id)
    .single();

  if (!currentMember) {
    return null;
  }

  // Get group info
  const { data: group } = await supabase
    .from("groups")
    .select("id, name, school_name, invite_code")
    .eq("id", currentMember.group_id)
    .single();

  // Get all members in the group
  const { data: members } = await supabase
    .from("members")
    .select("id, user_id, display_name, role, phone, is_driver")
    .eq("group_id", currentMember.group_id)
    .order("role", { ascending: true })
    .order("display_name", { ascending: true });

  // Get all children in the group
  const { data: childrenData } = await supabase
    .from("children")
    .select(`
      id,
      member_id,
      first_name,
      last_name,
      grade,
      notes,
      members!inner (
        id,
        display_name
      )
    `)
    .in("member_id", members?.map(m => m.id) || []);

  // Transform the data to match expected type
  const groupChildren = ((childrenData || []) as ChildData[]).map((c) => ({
    id: c.id,
    member_id: c.member_id,
    first_name: c.first_name,
    last_name: c.last_name,
    grade: c.grade,
    notes: c.notes,
    members: Array.isArray(c.members) ? c.members[0] : c.members,
  }));

  return (
    <GroupClient
      group={group!}
      members={members || []}
      groupChildren={groupChildren}
      currentMember={currentMember}
      userId={user.id}
    />
  );
}
