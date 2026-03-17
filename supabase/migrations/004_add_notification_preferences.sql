-- Add notification preferences to members table
-- Stored as JSONB: { "trip_confirmed": true, "trip_update": true, "unassigned_reminder": true }
-- All default to true (opted-in by default)

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{"trip_confirmed": true, "trip_update": true, "unassigned_reminder": true}';
