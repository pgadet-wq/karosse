-- Allow all group members to update and delete trips (not just admins/drivers)
-- This is needed because trip management (confirm, cancel, change driver)
-- is now open to all members, not just admins.

DROP POLICY IF EXISTS "Group admins can update trips" ON trips;

CREATE POLICY "Group members can update trips"
  ON trips FOR UPDATE
  USING (group_id IN (SELECT get_user_group_ids()));

DROP POLICY IF EXISTS "Group admins can delete trips" ON trips;

CREATE POLICY "Group members can delete trips"
  ON trips FOR DELETE
  USING (group_id IN (SELECT get_user_group_ids()));
