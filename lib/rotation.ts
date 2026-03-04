import { addDays, subWeeks } from "date-fns";
import { isSchoolDay } from "./calendar-utils";

interface Driver {
  id: string;
  member_id: string;
  display_name: string | null;
  max_passengers: number;
  available_days: string[]; // ['lun', 'mar', 'mer', 'jeu', 'ven']
}

interface HistoricalTrip {
  driver_id: string;
  date: string;
  direction: "aller" | "retour";
}

interface RotationResult {
  date: Date;
  direction: "aller" | "retour";
  driverId: string;
  driverName: string | null;
}

const DAY_KEYS = ["lun", "mar", "mer", "jeu", "ven"];

/**
 * Count trips per driver in the historical data
 */
function countTripsPerDriver(
  history: HistoricalTrip[],
  driverIds: string[]
): Map<string, number> {
  const counts = new Map<string, number>();

  // Initialize all drivers with 0
  driverIds.forEach((id) => counts.set(id, 0));

  // Count historical trips
  history.forEach((trip) => {
    const current = counts.get(trip.driver_id) || 0;
    counts.set(trip.driver_id, current + 1);
  });

  return counts;
}

/**
 * Get available drivers for a specific day
 */
function getAvailableDrivers(drivers: Driver[], dayKey: string): Driver[] {
  return drivers.filter(
    (d) => d.available_days.includes(dayKey) || d.available_days.length === 0
  );
}

/**
 * Select the best driver based on:
 * 1. Least trips in recent history
 * 2. Round-robin in case of equality
 * 3. Avoid assigning both aller and retour to same driver on same day
 */
function selectBestDriver(
  availableDrivers: Driver[],
  tripCounts: Map<string, number>,
  assignedToday: string | null, // Driver already assigned for the other direction today
  roundRobinIndex: number
): Driver | null {
  if (availableDrivers.length === 0) return null;

  // Filter out the driver already assigned today if possible
  let candidates = availableDrivers;
  if (assignedToday && availableDrivers.length > 1) {
    candidates = availableDrivers.filter((d) => d.id !== assignedToday);
  }

  // Sort by trip count (ascending)
  const sorted = [...candidates].sort((a, b) => {
    const countA = tripCounts.get(a.id) || 0;
    const countB = tripCounts.get(b.id) || 0;
    return countA - countB;
  });

  // Find all drivers with the minimum count
  const minCount = tripCounts.get(sorted[0].id) || 0;
  const minDrivers = sorted.filter(
    (d) => (tripCounts.get(d.id) || 0) === minCount
  );

  // Round-robin among drivers with equal counts
  const selectedIndex = roundRobinIndex % minDrivers.length;
  return minDrivers[selectedIndex];
}

/**
 * Generate rotation suggestions for a week
 *
 * @param drivers - List of active drivers with their availability
 * @param weekStart - Start of the week to plan (Monday)
 * @param history - Historical trips from the past 4 weeks
 * @returns Array of suggested assignments
 */
export function generateRotation(
  drivers: Driver[],
  weekStart: Date,
  history: HistoricalTrip[]
): RotationResult[] {
  const results: RotationResult[] = [];
  const driverIds = drivers.map((d) => d.id);

  // Count trips from history
  const tripCounts = countTripsPerDriver(history, driverIds);

  // Track assignments for this week to update counts as we go
  const weekAssignments = new Map<string, number>();
  driverIds.forEach((id) => weekAssignments.set(id, 0));

  let roundRobinIndex = 0;

  // For each day of the week (Mon-Fri)
  for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
    const currentDate = addDays(weekStart, dayOffset);
    const dayKey = DAY_KEYS[dayOffset];

    // Skip non-school days
    if (!isSchoolDay(currentDate)) {
      continue;
    }

    // Get available drivers for this day
    const availableDrivers = getAvailableDrivers(drivers, dayKey);

    if (availableDrivers.length === 0) {
      continue;
    }

    // Combined counts (history + this week's assignments)
    const combinedCounts = new Map<string, number>();
    driverIds.forEach((id) => {
      combinedCounts.set(
        id,
        (tripCounts.get(id) || 0) + (weekAssignments.get(id) || 0)
      );
    });

    // Assign ALLER
    const allerDriver = selectBestDriver(
      availableDrivers,
      combinedCounts,
      null,
      roundRobinIndex
    );

    if (allerDriver) {
      results.push({
        date: currentDate,
        direction: "aller",
        driverId: allerDriver.id,
        driverName: allerDriver.display_name,
      });

      // Update counts
      weekAssignments.set(
        allerDriver.id,
        (weekAssignments.get(allerDriver.id) || 0) + 1
      );
      combinedCounts.set(
        allerDriver.id,
        (combinedCounts.get(allerDriver.id) || 0) + 1
      );
    }

    roundRobinIndex++;

    // Assign RETOUR (try to avoid same driver as aller)
    const retourDriver = selectBestDriver(
      availableDrivers,
      combinedCounts,
      allerDriver?.id || null,
      roundRobinIndex
    );

    if (retourDriver) {
      results.push({
        date: currentDate,
        direction: "retour",
        driverId: retourDriver.id,
        driverName: retourDriver.display_name,
      });

      // Update counts
      weekAssignments.set(
        retourDriver.id,
        (weekAssignments.get(retourDriver.id) || 0) + 1
      );
    }

    roundRobinIndex++;
  }

  return results;
}

/**
 * Copy assignments from the previous week
 */
export function copyPreviousWeek(
  previousWeekTrips: HistoricalTrip[],
  targetWeekStart: Date,
  drivers: Driver[]
): RotationResult[] {
  const results: RotationResult[] = [];
  const driverMap = new Map(drivers.map((d) => [d.id, d]));

  // Group previous week trips by day offset
  const previousWeekStart = subWeeks(targetWeekStart, 1);

  previousWeekTrips.forEach((trip) => {
    const tripDate = new Date(trip.date);
    const dayOffset = Math.floor(
      (tripDate.getTime() - previousWeekStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (dayOffset >= 0 && dayOffset < 5) {
      const targetDate = addDays(targetWeekStart, dayOffset);

      // Only copy if it's a school day
      if (isSchoolDay(targetDate)) {
        const driver = driverMap.get(trip.driver_id);
        if (driver) {
          results.push({
            date: targetDate,
            direction: trip.direction,
            driverId: trip.driver_id,
            driverName: driver.display_name,
          });
        }
      }
    }
  });

  return results;
}

/**
 * Calculate driver statistics for the week
 */
export function calculateWeekStats(
  assignments: RotationResult[]
): Map<string, { aller: number; retour: number; total: number }> {
  const stats = new Map<
    string,
    { aller: number; retour: number; total: number }
  >();

  assignments.forEach((assignment) => {
    const current = stats.get(assignment.driverId) || {
      aller: 0,
      retour: 0,
      total: 0,
    };

    if (assignment.direction === "aller") {
      current.aller++;
    } else {
      current.retour++;
    }
    current.total++;

    stats.set(assignment.driverId, current);
  });

  return stats;
}
