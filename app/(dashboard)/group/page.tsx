import type { Metadata } from "next";
import { redirect } from "next/navigation";
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

interface MemberGroupData {
  id: string;
  group_id: string;
  display_name: string | null;
  role: string;
  groups: {
    id: string;
    name: string;
    school_name: string | null;
    invite_code: string;
  } | {
    id: string;
    name: string;
    school_name: string | null;
    invite_code: string;
  }[];
}

export default async function GroupPage({
  searchParams,
}: {
  searchParams: { group?: string };
}) {
  const supabase = createServerClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get ALL user's memberships with group info
  const { data: allMemberships } = await supabase
    .from("members")
    .select(`
      id, group_id, display_name, role,
      groups (id, name, school_name, invite_code)
    `)
    .eq("user_id", user.id);

  if (!allMemberships || allMemberships.length === 0) {
    redirect("/onboarding");
  }

  // Build list of user's groups for the selector
  const userGroups = (allMemberships as unknown as MemberGroupData[]).map((m) => {
    const g = Array.isArray(m.groups) ? m.groups[0] : m.groups;
    return {
      id: g.id,
      name: g.name,
      school_name: g.school_name,
      invite_code: g.invite_code,
      memberId: m.id,
      role: m.role,
      display_name: m.display_name,
    };
  });

  // Find the selected group (from query param, then cookie, then first)
  const selectedGroupId = searchParams.group;
  let activeGroupIndex = -1;

  if (selectedGroupId) {
    activeGroupIndex = userGroups.findIndex((g) => g.id === selectedGroupId);
  }

  if (activeGroupIndex < 0) {
    // Try cookie
    const { cookies } = await import("next/headers");
    const cookieGroupId = cookies().get("karosse_active_group")?.value;
    if (cookieGroupId) {
      activeGroupIndex = userGroups.findIndex((g) => g.id === cookieGroupId);
    }
  }

  if (activeGroupIndex < 0) activeGroupIndex = 0;

  const activeGroup = userGroups[activeGroupIndex];
  const currentMember = allMemberships[activeGroupIndex];

  // Get group info
  const { data: group } = await supabase
    .from("groups")
    .select("id, name, school_name, invite_code")
    .eq("id", activeGroup.id)
    .single();

  // Get all members in the group
  const { data: members } = await supabase
    .from("members")
    .select("id, user_id, display_name, role, phone, is_driver")
    .eq("group_id", activeGroup.id)
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
      currentMember={{
        id: currentMember.id,
        group_id: currentMember.group_id,
        display_name: currentMember.display_name,
        role: currentMember.role,
      }}
      userId={user.id}
      userGroups={userGroups}
    />
  );
}
