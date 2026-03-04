-- Migration 003: Add driver availability days and update trips table
-- This migration adds:
-- 1. available_days column to drivers table
-- 2. Makes driver_id nullable in trips table
-- 3. Adds new status values to trips

-- ============================================================================
-- ADD AVAILABLE_DAYS TO DRIVERS
-- Array of day keys: 'lun', 'mar', 'mer', 'jeu', 'ven'
-- Empty array means available every day
-- ============================================================================
ALTER TABLE drivers
ADD COLUMN IF NOT EXISTS available_days TEXT[] NOT NULL DEFAULT '{}';

-- ============================================================================
-- MAKE DRIVER_ID NULLABLE IN TRIPS
-- Allow trips to be created without a driver assigned
-- ============================================================================
ALTER TABLE trips
ALTER COLUMN driver_id DROP NOT NULL;

-- ============================================================================
-- MAKE DEPARTURE_TIME NULLABLE IN TRIPS
-- Allow trips to be created without a specific time
-- ============================================================================
ALTER TABLE trips
ALTER COLUMN departure_time DROP NOT NULL;

-- ============================================================================
-- UPDATE STATUS CHECK CONSTRAINT IN TRIPS
-- Add 'planned' and 'unassigned' status values
-- ============================================================================
ALTER TABLE trips
DROP CONSTRAINT IF EXISTS trips_status_check;

ALTER TABLE trips
ADD CONSTRAINT trips_status_check
CHECK (status IN ('planned', 'unassigned', 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled'));

-- ============================================================================
-- UPDATE RLS POLICIES FOR TRIPS
-- Allow group members to create/update trips (not just drivers)
-- ============================================================================

-- Drop existing insert policy
DROP POLICY IF EXISTS "Drivers can create trips" ON trips;

-- Create new insert policy for group members
CREATE POLICY "Group members can create trips"
  ON trips FOR INSERT
  WITH CHECK (group_id IN (SELECT get_user_group_ids()));

-- Drop existing update policy
DROP POLICY IF EXISTS "Drivers can update their own trips" ON trips;

-- Create new update policy for group admins and drivers
CREATE POLICY "Group admins can update trips"
  ON trips FOR UPDATE
  USING (
    group_id IN (
      SELECT group_id FROM members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    driver_id IN (
      SELECT d.id FROM drivers d
      JOIN members m ON d.member_id = m.id
      WHERE m.user_id = auth.uid()
    )
  );

-- Drop existing delete policy
DROP POLICY IF EXISTS "Drivers can delete their own trips" ON trips;

-- Create new delete policy for group admins and assigned drivers
CREATE POLICY "Group admins can delete trips"
  ON trips FOR DELETE
  USING (
    group_id IN (
      SELECT group_id FROM members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    driver_id IN (
      SELECT d.id FROM drivers d
      JOIN members m ON d.member_id = m.id
      WHERE m.user_id = auth.uid()
    )
  );

-- ============================================================================
-- ENABLE REALTIME FOR TRIPS
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE trips;
