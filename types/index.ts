// ============================================================================
// DATABASE TYPES - Match the Supabase schema
// ============================================================================

// Group - A carpooling group (parents from same school/neighborhood)
export interface Group {
  id: string;
  name: string;
  description: string | null;
  school_name: string | null;
  school_address: string | null;
  invite_code: string;
  created_at: string;
  updated_at: string;
}

// Member - User membership in a group
export interface Member {
  id: string;
  user_id: string;
  group_id: string;
  role: "admin" | "member";
  display_name: string | null;
  phone: string | null;
  is_driver: boolean;
  created_at: string;
  updated_at: string;
}

// Driver - Driver-specific info for members who can drive
export interface Driver {
  id: string;
  member_id: string;
  vehicle_model: string | null;
  vehicle_color: string | null;
  license_plate: string | null;
  max_passengers: number;
  available_days: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Child - Children associated with a member
export interface Child {
  id: string;
  member_id: string;
  first_name: string;
  last_name: string | null;
  grade: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// SchoolCalendar - School days, holidays, vacations
export interface SchoolCalendarDay {
  id: string;
  date: string; // YYYY-MM-DD
  is_school_day: boolean;
  label: string | null;
  type: "school" | "holiday" | "vacation" | "weekend";
  created_at: string;
}

// Trip - Scheduled carpool trip
export interface Trip {
  id: string;
  group_id: string;
  driver_id: string | null;
  date: string; // YYYY-MM-DD
  direction: "to_school" | "from_school";
  departure_time: string | null; // HH:MM:SS
  available_seats: number;
  status: "planned" | "unassigned" | "confirmed" | "cancelled";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// TripPassenger - Child assigned to a trip
export interface TripPassenger {
  id: string;
  trip_id: string;
  child_id: string;
  status: "pending" | "confirmed" | "cancelled" | "no_show";
  pickup_address: string | null;
  dropoff_address: string | null;
  created_at: string;
  updated_at: string;
}

// PushSubscription - Web push notification subscription
export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// JOINED/EXTENDED TYPES - For queries with relations
// ============================================================================

export interface MemberWithUser extends Member {
  user?: {
    email: string;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
    };
  };
}

export interface DriverWithMember extends Driver {
  member?: MemberWithUser;
}

export interface TripWithDriver extends Trip {
  driver?: DriverWithMember;
}

export interface TripPassengerWithChild extends TripPassenger {
  child?: Child;
}

export interface TripFull extends Trip {
  driver?: DriverWithMember;
  passengers?: TripPassengerWithChild[];
}

export interface ChildWithMember extends Child {
  member?: MemberWithUser;
}

// ============================================================================
// FORM TYPES - For creating/updating records
// ============================================================================

export type GroupCreate = Pick<Group, "name"> & Partial<Pick<Group, "description" | "school_name" | "school_address">>;
export type GroupUpdate = Partial<GroupCreate>;

export type MemberCreate = Pick<Member, "group_id"> & Partial<Pick<Member, "display_name" | "phone" | "is_driver">>;
export type MemberUpdate = Partial<Pick<Member, "display_name" | "phone" | "is_driver" | "role">>;

export type DriverCreate = Pick<Driver, "member_id"> & Partial<Pick<Driver, "vehicle_model" | "vehicle_color" | "license_plate" | "max_passengers">>;
export type DriverUpdate = Partial<Pick<Driver, "vehicle_model" | "vehicle_color" | "license_plate" | "max_passengers" | "is_active">>;

export type ChildCreate = Pick<Child, "member_id" | "first_name"> & Partial<Pick<Child, "last_name" | "grade" | "notes">>;
export type ChildUpdate = Partial<Pick<Child, "first_name" | "last_name" | "grade" | "notes">>;

export type TripCreate = Pick<Trip, "group_id" | "driver_id" | "date" | "direction" | "departure_time" | "available_seats"> & Partial<Pick<Trip, "notes">>;
export type TripUpdate = Partial<Pick<Trip, "departure_time" | "available_seats" | "status" | "notes">>;

export type TripPassengerCreate = Pick<TripPassenger, "trip_id" | "child_id"> & Partial<Pick<TripPassenger, "pickup_address" | "dropoff_address">>;
export type TripPassengerUpdate = Partial<Pick<TripPassenger, "status" | "pickup_address" | "dropoff_address">>;

// ============================================================================
// CALENDAR VIEW TYPES - Shaped for the calendar UI components
// ============================================================================

export interface CalendarDriver {
  id: string;
  member_id: string;
  display_name: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  max_passengers: number;
  available_days: string[];
}

export interface CalendarChild {
  id: string;
  first_name: string;
  last_name: string | null;
}

export interface CalendarTripPassenger {
  id: string;
  status: "confirmed" | "pending" | "cancelled";
  child: CalendarChild;
}

export interface CalendarTrip {
  id: string;
  date: string;
  direction: "aller" | "retour";
  status: "confirmed" | "planned" | "unassigned";
  departure_time: string | null;
  available_seats: number;
  driver?: Omit<CalendarDriver, "available_days">;
  passengers: CalendarTripPassenger[];
}

export interface RawTrip {
  id: string;
  date: string;
  direction: string;
  driver_id: string | null;
  status: string;
}
