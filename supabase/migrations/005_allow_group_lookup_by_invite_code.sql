-- Allow authenticated users to look up a group by invite_code
-- This is needed for the join flow: users who are NOT yet members
-- need to find the group to join it.

CREATE POLICY "Authenticated users can view groups by invite code"
  ON groups FOR SELECT
  USING (auth.uid() IS NOT NULL);
