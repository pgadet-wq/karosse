-- Fix trips table: make driver_id nullable and align status enum with app code
-- The app uses 'planned', 'unassigned', 'confirmed', 'cancelled' but the original
-- schema defined 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled'.

-- 1. Make driver_id nullable (required for unassigned trips)
ALTER TABLE trips ALTER COLUMN driver_id DROP NOT NULL;

-- 2. Make departure_time nullable (not always known at planning time)
ALTER TABLE trips ALTER COLUMN departure_time DROP NOT NULL;

-- 3. Drop the old status CHECK constraint and add the correct one
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_status_check;
ALTER TABLE trips ADD CONSTRAINT trips_status_check
  CHECK (status IN ('planned', 'unassigned', 'confirmed', 'cancelled'));

-- 4. Migrate any existing data with old statuses
UPDATE trips SET status = 'planned' WHERE status = 'scheduled';
UPDATE trips SET status = 'confirmed' WHERE status = 'in_progress';
UPDATE trips SET status = 'confirmed' WHERE status = 'completed';

-- 5. Set unassigned status for trips without a driver
UPDATE trips SET status = 'unassigned' WHERE driver_id IS NULL AND status != 'cancelled';

-- 6. Tighten RLS: only admin or trip's driver can update/delete trips
-- (replaces the overly permissive migration 006 that allowed any member)
DROP POLICY IF EXISTS "Group members can update trips" ON trips;
DROP POLICY IF EXISTS "Group members can delete trips" ON trips;
DROP POLICY IF EXISTS "Drivers can update their own trips" ON trips;
DROP POLICY IF EXISTS "Drivers can delete their own trips" ON trips;

-- Members can create trips in their group (for unassigned trips too)
DROP POLICY IF EXISTS "Drivers can create trips" ON trips;
CREATE POLICY "Members can create trips"
  ON trips FOR INSERT
  WITH CHECK (group_id IN (SELECT get_user_group_ids()));

-- Drivers can update their own trips, or admins can update any trip in their group
CREATE POLICY "Driver or admin can update trips"
  ON trips FOR UPDATE
  USING (
    -- Trip's driver
    driver_id IN (
      SELECT d.id FROM drivers d
      JOIN members m ON d.member_id = m.id
      WHERE m.user_id = auth.uid()
    )
    OR
    -- Group admin
    group_id IN (
      SELECT group_id FROM members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    -- Unassigned trip in user's group
    (driver_id IS NULL AND group_id IN (SELECT get_user_group_ids()))
  );

-- Drivers can delete their own trips, or admins can delete any trip
CREATE POLICY "Driver or admin can delete trips"
  ON trips FOR DELETE
  USING (
    driver_id IN (
      SELECT d.id FROM drivers d
      JOIN members m ON d.member_id = m.id
      WHERE m.user_id = auth.uid()
    )
    OR
    group_id IN (
      SELECT group_id FROM members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    (driver_id IS NULL AND group_id IN (SELECT get_user_group_ids()))
  );
