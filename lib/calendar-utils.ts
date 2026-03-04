import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isWeekend,
  format,
  differenceInDays,
  getWeek,
  isWithinInterval,
  isSameDay,
  addDays,
} from "date-fns";
import { fr } from "date-fns/locale";

// School year 2026: February 16 - December 19
const SCHOOL_YEAR_START = new Date("2026-02-16");
const SCHOOL_YEAR_END = new Date("2026-12-19");

// Vacation periods 2026
const VACATION_PERIODS = [
  { name: "Vacances d'avril", start: new Date("2026-04-04"), end: new Date("2026-04-19") },
  { name: "Vacances de juin", start: new Date("2026-06-06"), end: new Date("2026-06-21") },
  { name: "Vacances d'août", start: new Date("2026-08-08"), end: new Date("2026-08-23") },
  { name: "Vacances d'octobre", start: new Date("2026-10-10"), end: new Date("2026-10-25") },
  { name: "Grandes vacances", start: new Date("2026-12-20"), end: new Date("2027-02-15") },
];

// Holidays New Caledonia 2026
const HOLIDAYS: { date: Date; label: string }[] = [
  { date: new Date("2026-04-06"), label: "Lundi de Pâques" },
  { date: new Date("2026-05-01"), label: "Fête du Travail" },
  { date: new Date("2026-05-08"), label: "Victoire 1945" },
  { date: new Date("2026-05-14"), label: "Ascension" },
  { date: new Date("2026-05-25"), label: "Lundi de Pentecôte" },
  { date: new Date("2026-07-14"), label: "Fête nationale" },
  { date: new Date("2026-08-15"), label: "Assomption" },
  { date: new Date("2026-09-24"), label: "Fête de la Citoyenneté NC" },
  { date: new Date("2026-11-01"), label: "Toussaint" },
  { date: new Date("2026-11-11"), label: "Armistice" },
];

// School periods (between vacations)
const SCHOOL_PERIODS = [
  { name: "Période 1", start: new Date("2026-02-16"), end: new Date("2026-04-03") },
  { name: "Période 2", start: new Date("2026-04-20"), end: new Date("2026-06-05") },
  { name: "Période 3", start: new Date("2026-06-22"), end: new Date("2026-08-07") },
  { name: "Période 4", start: new Date("2026-08-24"), end: new Date("2026-10-09") },
  { name: "Période 5", start: new Date("2026-10-26"), end: new Date("2026-12-19") },
];

/**
 * Normalize a date to midnight UTC for comparison
 */
function normalizeDate(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

/**
 * Check if a date is within a vacation period
 */
export function isVacation(date: Date): boolean {
  const normalized = normalizeDate(date);

  return VACATION_PERIODS.some((period) =>
    isWithinInterval(normalized, {
      start: normalizeDate(period.start),
      end: normalizeDate(period.end),
    })
  );
}

/**
 * Get vacation info for a date
 */
export function getVacationInfo(date: Date): { isVacation: boolean; name?: string; endsOn?: Date } {
  const normalized = normalizeDate(date);

  for (const period of VACATION_PERIODS) {
    if (
      isWithinInterval(normalized, {
        start: normalizeDate(period.start),
        end: normalizeDate(period.end),
      })
    ) {
      return {
        isVacation: true,
        name: period.name,
        endsOn: period.end,
      };
    }
  }

  return { isVacation: false };
}

/**
 * Check if a date is a holiday
 */
export function isHoliday(date: Date): { isHoliday: boolean; label?: string } {
  const normalized = normalizeDate(date);

  for (const holiday of HOLIDAYS) {
    if (isSameDay(normalized, normalizeDate(holiday.date))) {
      return { isHoliday: true, label: holiday.label };
    }
  }

  return { isHoliday: false };
}

/**
 * Check if a date is a school day
 * Returns true if weekday (Mon-Fri), not in vacation, not a holiday, and within school year
 */
export function isSchoolDay(date: Date): boolean {
  const normalized = normalizeDate(date);

  // Must be within school year
  if (normalized < normalizeDate(SCHOOL_YEAR_START) || normalized > normalizeDate(SCHOOL_YEAR_END)) {
    return false;
  }

  // Must not be a weekend
  if (isWeekend(normalized)) {
    return false;
  }

  // Must not be in vacation
  if (isVacation(normalized)) {
    return false;
  }

  // Must not be a holiday
  if (isHoliday(normalized).isHoliday) {
    return false;
  }

  return true;
}

/**
 * Get school days in a given week
 */
export function getSchoolDaysInWeek(weekStart: Date): Date[] {
  const start = startOfWeek(weekStart, { weekStartsOn: 1 }); // Monday
  const end = endOfWeek(weekStart, { weekStartsOn: 1 }); // Sunday

  const allDays = eachDayOfInterval({ start, end });

  // Filter to only weekdays (Mon-Fri)
  const weekdays = allDays.filter((day) => !isWeekend(day));

  return weekdays;
}

/**
 * Get all vacation periods
 */
export function getVacationPeriods(): { name: string; start: Date; end: Date }[] {
  return [...VACATION_PERIODS];
}

/**
 * Get all holidays
 */
export function getHolidays(): { date: Date; label: string }[] {
  return [...HOLIDAYS];
}

/**
 * Get the current period info
 */
export function getCurrentPeriod(date: Date): {
  type: "school" | "vacation" | "summer";
  name: string;
  endsIn: number;
  nextDate?: Date;
} {
  const normalized = normalizeDate(date);

  // Check if in vacation
  const vacationInfo = getVacationInfo(normalized);
  if (vacationInfo.isVacation) {
    const endsIn = differenceInDays(vacationInfo.endsOn!, normalized);
    const nextSchoolDay = addDays(vacationInfo.endsOn!, 1);

    return {
      type: vacationInfo.name === "Grandes vacances" ? "summer" : "vacation",
      name: vacationInfo.name!,
      endsIn,
      nextDate: nextSchoolDay,
    };
  }

  // Check if before school year
  if (normalized < normalizeDate(SCHOOL_YEAR_START)) {
    const endsIn = differenceInDays(SCHOOL_YEAR_START, normalized);
    return {
      type: "summer",
      name: "Avant la rentrée",
      endsIn,
      nextDate: SCHOOL_YEAR_START,
    };
  }

  // Check if after school year
  if (normalized > normalizeDate(SCHOOL_YEAR_END)) {
    return {
      type: "summer",
      name: "Grandes vacances",
      endsIn: 0,
    };
  }

  // Find current school period
  for (const period of SCHOOL_PERIODS) {
    if (
      isWithinInterval(normalized, {
        start: normalizeDate(period.start),
        end: normalizeDate(period.end),
      })
    ) {
      const endsIn = differenceInDays(period.end, normalized);
      return {
        type: "school",
        name: period.name,
        endsIn,
        nextDate: addDays(period.end, 1),
      };
    }
  }

  return {
    type: "school",
    name: "Période scolaire",
    endsIn: 0,
  };
}

/**
 * Get week number within current school period (1-7)
 */
export function getWeekNumber(date: Date): number {
  const normalized = normalizeDate(date);

  // Find current period
  for (const period of SCHOOL_PERIODS) {
    if (
      isWithinInterval(normalized, {
        start: normalizeDate(period.start),
        end: normalizeDate(period.end),
      })
    ) {
      const periodStart = startOfWeek(period.start, { weekStartsOn: 1 });
      const currentWeekStart = startOfWeek(normalized, { weekStartsOn: 1 });
      const weeksDiff = Math.floor(
        differenceInDays(currentWeekStart, periodStart) / 7
      );
      return Math.min(weeksDiff + 1, 7);
    }
  }

  return getWeek(normalized, { weekStartsOn: 1, firstWeekContainsDate: 4 });
}

/**
 * Get the total number of weeks in the current period
 */
export function getTotalWeeksInPeriod(date: Date): number {
  const normalized = normalizeDate(date);

  for (const period of SCHOOL_PERIODS) {
    if (
      isWithinInterval(normalized, {
        start: normalizeDate(period.start),
        end: normalizeDate(period.end),
      })
    ) {
      const periodStart = startOfWeek(period.start, { weekStartsOn: 1 });
      const periodEnd = startOfWeek(period.end, { weekStartsOn: 1 });
      return Math.floor(differenceInDays(periodEnd, periodStart) / 7) + 1;
    }
  }

  return 7;
}

/**
 * Format a date in French
 */
export function formatDateFr(date: Date, formatStr: string): string {
  return format(date, formatStr, { locale: fr });
}

/**
 * Get the day status (school, holiday, vacation, weekend)
 */
export function getDayStatus(date: Date): {
  type: "school" | "holiday" | "vacation" | "weekend";
  label?: string;
} {
  if (isWeekend(date)) {
    return { type: "weekend" };
  }

  const holidayInfo = isHoliday(date);
  if (holidayInfo.isHoliday) {
    return { type: "holiday", label: holidayInfo.label };
  }

  const vacationInfo = getVacationInfo(date);
  if (vacationInfo.isVacation) {
    return { type: "vacation", label: vacationInfo.name };
  }

  return { type: "school" };
}
