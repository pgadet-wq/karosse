-- Allow all group members to update trips (confirm, cancel, change driver)
-- In a carpooling group, any member needs to be able to manage trips.
-- Only admins can delete trips.

DROP POLICY IF EXISTS "Driver or admin can update trips" ON trips;
DROP POLICY IF EXISTS "Group members can update trips" ON trips;

CREATE POLICY "Group members can update trips"
  ON trips FOR UPDATE
  USING (group_id IN (SELECT get_user_group_ids()));

DROP POLICY IF EXISTS "Driver or admin can delete trips" ON trips;
DROP POLICY IF EXISTS "Group admins can delete trips" ON trips;

CREATE POLICY "Group admins can delete trips"
  ON trips FOR DELETE
  USING (group_id IN (
    SELECT group_id FROM members
    WHERE user_id = auth.uid() AND role = 'admin'
  ));
