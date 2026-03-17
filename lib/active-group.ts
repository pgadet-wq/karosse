import { cookies } from "next/headers";
import { SupabaseClient } from "@supabase/supabase-js";

const COOKIE_NAME = "karosse_active_group";

/**
 * Server-side: resolve the active group for the current user.
 * Reads the cookie, validates it against the user's memberships,
 * and returns the matching member record.
 */
export async function getActiveGroupMember(
  supabase: SupabaseClient,
  userId: string
) {
  const { data: allMembers } = await supabase
    .from("members")
    .select("id, group_id, display_name, role, is_driver")
    .eq("user_id", userId);

  if (!allMembers || allMembers.length === 0) {
    return null;
  }

  // Check cookie for preferred group
  const cookieStore = cookies();
  const preferredGroupId = cookieStore.get(COOKIE_NAME)?.value;

  if (preferredGroupId) {
    const match = allMembers.find((m) => m.group_id === preferredGroupId);
    if (match) return match;
  }

  // Fallback to first group
  return allMembers[0];
}
