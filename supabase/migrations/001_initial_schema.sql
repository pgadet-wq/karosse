-- KAROSSE - Initial Schema Migration
-- Tables: groups, members, drivers, children, trips, school_calendar, push_subscriptions

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- GROUPS TABLE
-- Represents a carpooling group (e.g., parents from the same school/neighborhood)
-- ============================================================================
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  school_name VARCHAR(255),
  school_address TEXT,
  invite_code VARCHAR(8) UNIQUE NOT NULL DEFAULT UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- MEMBERS TABLE
-- Links users to groups with their role
-- ============================================================================
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  display_name VARCHAR(255),
  phone VARCHAR(20),
  is_driver BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, group_id)
);

-- ============================================================================
-- DRIVERS TABLE
-- Driver-specific information for members who can drive
-- ============================================================================
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE UNIQUE,
  vehicle_model VARCHAR(255),
  vehicle_color VARCHAR(100),
  license_plate VARCHAR(20),
  max_passengers INTEGER NOT NULL DEFAULT 4 CHECK (max_passengers > 0 AND max_passengers <= 8),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CHILDREN TABLE
-- Children associated with a member
-- ============================================================================
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255),
  grade VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- SCHOOL_CALENDAR TABLE
-- Defines school days, holidays, and special days
-- ============================================================================
CREATE TABLE school_calendar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  is_school_day BOOLEAN NOT NULL DEFAULT TRUE,
  label VARCHAR(255),
  type VARCHAR(50) NOT NULL DEFAULT 'school' CHECK (type IN ('school', 'holiday', 'vacation', 'weekend')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TRIPS TABLE
-- Scheduled carpool trips
-- ============================================================================
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('to_school', 'from_school')),
  departure_time TIME NOT NULL,
  available_seats INTEGER NOT NULL CHECK (available_seats >= 0),
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TRIP_PASSENGERS TABLE
-- Children assigned to trips
-- ============================================================================
CREATE TABLE trip_passengers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'no_show')),
  pickup_address TEXT,
  dropoff_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(trip_id, child_id)
);

-- ============================================================================
-- PUSH_SUBSCRIPTIONS TABLE
-- Web push notification subscriptions
-- ============================================================================
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_members_user_id ON members(user_id);
CREATE INDEX idx_members_group_id ON members(group_id);
CREATE INDEX idx_drivers_member_id ON drivers(member_id);
CREATE INDEX idx_children_member_id ON children(member_id);
CREATE INDEX idx_trips_date ON trips(date);
CREATE INDEX idx_trips_group_id ON trips(group_id);
CREATE INDEX idx_trips_driver_id ON trips(driver_id);
CREATE INDEX idx_trips_group_date ON trips(group_id, date);
CREATE INDEX idx_school_calendar_date ON school_calendar(date);
CREATE INDEX idx_school_calendar_type ON school_calendar(type);
CREATE INDEX idx_trip_passengers_trip_id ON trip_passengers(trip_id);
CREATE INDEX idx_trip_passengers_child_id ON trip_passengers(child_id);
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_children_updated_at
  BEFORE UPDATE ON children
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trip_passengers_updated_at
  BEFORE UPDATE ON trip_passengers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_passengers ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTION: Get user's group IDs
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_group_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT group_id FROM members WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS POLICIES: GROUPS
-- Users can only access groups they are members of
-- ============================================================================
CREATE POLICY "Users can view their groups"
  ON groups FOR SELECT
  USING (id IN (SELECT get_user_group_ids()));

CREATE POLICY "Users can create groups"
  ON groups FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Group admins can update their groups"
  ON groups FOR UPDATE
  USING (id IN (
    SELECT group_id FROM members
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Group admins can delete their groups"
  ON groups FOR DELETE
  USING (id IN (
    SELECT group_id FROM members
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- ============================================================================
-- RLS POLICIES: MEMBERS
-- Users can view/manage members in their groups
-- ============================================================================
CREATE POLICY "Users can view members in their groups"
  ON members FOR SELECT
  USING (group_id IN (SELECT get_user_group_ids()));

CREATE POLICY "Users can join groups (insert themselves)"
  ON members FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own membership"
  ON members FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Group admins can update any member in their groups"
  ON members FOR UPDATE
  USING (group_id IN (
    SELECT group_id FROM members
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Users can delete their own membership"
  ON members FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Group admins can delete members from their groups"
  ON members FOR DELETE
  USING (group_id IN (
    SELECT group_id FROM members
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- ============================================================================
-- RLS POLICIES: DRIVERS
-- Users can manage drivers in their groups
-- ============================================================================
CREATE POLICY "Users can view drivers in their groups"
  ON drivers FOR SELECT
  USING (member_id IN (
    SELECT id FROM members WHERE group_id IN (SELECT get_user_group_ids())
  ));

CREATE POLICY "Users can create their own driver profile"
  ON drivers FOR INSERT
  WITH CHECK (member_id IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own driver profile"
  ON drivers FOR UPDATE
  USING (member_id IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own driver profile"
  ON drivers FOR DELETE
  USING (member_id IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  ));

-- ============================================================================
-- RLS POLICIES: CHILDREN
-- Users can manage children in their groups
-- ============================================================================
CREATE POLICY "Users can view children in their groups"
  ON children FOR SELECT
  USING (member_id IN (
    SELECT id FROM members WHERE group_id IN (SELECT get_user_group_ids())
  ));

CREATE POLICY "Users can add their own children"
  ON children FOR INSERT
  WITH CHECK (member_id IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own children"
  ON children FOR UPDATE
  USING (member_id IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own children"
  ON children FOR DELETE
  USING (member_id IN (
    SELECT id FROM members WHERE user_id = auth.uid()
  ));

-- ============================================================================
-- RLS POLICIES: TRIPS
-- Users can manage trips in their groups
-- ============================================================================
CREATE POLICY "Users can view trips in their groups"
  ON trips FOR SELECT
  USING (group_id IN (SELECT get_user_group_ids()));

CREATE POLICY "Drivers can create trips"
  ON trips FOR INSERT
  WITH CHECK (
    group_id IN (SELECT get_user_group_ids())
    AND driver_id IN (
      SELECT d.id FROM drivers d
      JOIN members m ON d.member_id = m.id
      WHERE m.user_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can update their own trips"
  ON trips FOR UPDATE
  USING (driver_id IN (
    SELECT d.id FROM drivers d
    JOIN members m ON d.member_id = m.id
    WHERE m.user_id = auth.uid()
  ));

CREATE POLICY "Drivers can delete their own trips"
  ON trips FOR DELETE
  USING (driver_id IN (
    SELECT d.id FROM drivers d
    JOIN members m ON d.member_id = m.id
    WHERE m.user_id = auth.uid()
  ));

-- ============================================================================
-- RLS POLICIES: TRIP_PASSENGERS
-- Users can manage passengers in their group's trips
-- ============================================================================
CREATE POLICY "Users can view passengers in their group trips"
  ON trip_passengers FOR SELECT
  USING (trip_id IN (
    SELECT id FROM trips WHERE group_id IN (SELECT get_user_group_ids())
  ));

CREATE POLICY "Users can add their children to trips"
  ON trip_passengers FOR INSERT
  WITH CHECK (
    child_id IN (
      SELECT c.id FROM children c
      JOIN members m ON c.member_id = m.id
      WHERE m.user_id = auth.uid()
    )
    AND trip_id IN (
      SELECT id FROM trips WHERE group_id IN (SELECT get_user_group_ids())
    )
  );

CREATE POLICY "Users can update their children's trip status"
  ON trip_passengers FOR UPDATE
  USING (child_id IN (
    SELECT c.id FROM children c
    JOIN members m ON c.member_id = m.id
    WHERE m.user_id = auth.uid()
  ));

CREATE POLICY "Trip drivers can update any passenger status"
  ON trip_passengers FOR UPDATE
  USING (trip_id IN (
    SELECT t.id FROM trips t
    JOIN drivers d ON t.driver_id = d.id
    JOIN members m ON d.member_id = m.id
    WHERE m.user_id = auth.uid()
  ));

CREATE POLICY "Users can remove their children from trips"
  ON trip_passengers FOR DELETE
  USING (child_id IN (
    SELECT c.id FROM children c
    JOIN members m ON c.member_id = m.id
    WHERE m.user_id = auth.uid()
  ));

-- ============================================================================
-- RLS POLICIES: SCHOOL_CALENDAR
-- Read-only for all authenticated users
-- ============================================================================
CREATE POLICY "Authenticated users can view school calendar"
  ON school_calendar FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- RLS POLICIES: PUSH_SUBSCRIPTIONS
-- Users can only manage their own subscriptions
-- ============================================================================
CREATE POLICY "Users can view their own push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own push subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own push subscriptions"
  ON push_subscriptions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own push subscriptions"
  ON push_subscriptions FOR DELETE
  USING (user_id = auth.uid());
