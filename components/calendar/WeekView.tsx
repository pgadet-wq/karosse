"use client";

import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Car, Sun } from "lucide-react";
import { addWeeks, subWeeks, startOfWeek, format, isToday } from "date-fns";
import {
  getSchoolDaysInWeek,
  getDayStatus,
  getWeekNumber,
  getTotalWeeksInPeriod,
  getCurrentPeriod,
  formatDateFr,
} from "@/lib/calendar-utils";

interface Trip {
  id: string;
  date: string;
  direction: "aller" | "retour";
  status: "confirmed" | "planned" | "cancelled" | "unassigned";
  driver?: {
    id: string;
    display_name: string | null;
  };
}

interface WeekViewProps {
  trips: Trip[];
  onDayClick: (date: Date) => void;
  onWeekChange?: (weekStart: Date) => void;
}

export function WeekView({ trips, onDayClick, onWeekChange }: WeekViewProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const touchStartX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const weekDays = getSchoolDaysInWeek(currentWeekStart);
  const weekNumber = getWeekNumber(currentWeekStart);
  const totalWeeks = getTotalWeeksInPeriod(currentWeekStart);
  const periodInfo = getCurrentPeriod(currentWeekStart);

  function updateWeek(newWeekStart: Date) {
    setCurrentWeekStart(newWeekStart);
    onWeekChange?.(newWeekStart);
  }

  function goToPreviousWeek() {
    const newWeek = subWeeks(currentWeekStart, 1);
    updateWeek(newWeek);
  }

  function goToNextWeek() {
    const newWeek = addWeeks(currentWeekStart, 1);
    updateWeek(newWeek);
  }

  function goToToday() {
    const newWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
    updateWeek(newWeek);
  }

  // Touch handlers for swipe navigation
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNextWeek();
      } else {
        goToPreviousWeek();
      }
    }

    touchStartX.current = null;
  }

  // Get trips for a specific day
  function getTripsForDay(date: Date): { aller?: Trip; retour?: Trip } {
    const dateStr = format(date, "yyyy-MM-dd");
    const dayTrips = trips.filter((t) => t.date === dateStr);

    return {
      aller: dayTrips.find((t) => t.direction === "aller"),
      retour: dayTrips.find((t) => t.direction === "retour"),
    };
  }

  // Get status color
  function getStatusColor(status: Trip["status"]): string {
    switch (status) {
      case "confirmed":
        return "bg-success text-white";
      case "planned":
        return "bg-warning text-white";
      case "cancelled":
        return "bg-danger text-white";
      case "unassigned":
      default:
        return "bg-gray-200 text-gray-500";
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-primary text-white p-4">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={goToPreviousWeek}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Semaine précédente"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={goToToday}
            className="text-center hover:bg-white/10 px-3 py-1 rounded-lg transition-colors"
          >
            <div className="text-sm opacity-80">
              {formatDateFr(currentWeekStart, "MMMM yyyy")}
            </div>
            <div className="font-semibold">
              Semaine {weekNumber}/{totalWeeks} — {periodInfo.name}
            </div>
          </button>

          <button
            onClick={goToNextWeek}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Semaine suivante"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Period info banner */}
        {periodInfo.type === "vacation" && (
          <div className="flex items-center justify-center gap-2 bg-white/20 rounded-lg py-2 text-sm">
            <Sun className="w-4 h-4" />
            <span>{periodInfo.name} — Fin dans {periodInfo.endsIn} jours</span>
          </div>
        )}
      </div>

      {/* Week grid */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="p-3"
      >
        <div className="grid grid-cols-5 gap-2">
          {weekDays.map((day) => {
            const dayStatus = getDayStatus(day);
            const { aller, retour } = getTripsForDay(day);
            const isCurrentDay = isToday(day);
            const isDisabled = dayStatus.type !== "school";

            return (
              <button
                key={day.toISOString()}
                onClick={() => !isDisabled && onDayClick(day)}
                disabled={isDisabled}
                className={`relative flex flex-col items-center p-2 rounded-xl transition-all ${
                  isDisabled
                    ? "bg-gray-100 cursor-not-allowed"
                    : "hover:bg-gray-50 cursor-pointer"
                } ${isCurrentDay ? "ring-2 ring-accent ring-offset-2" : ""}`}
              >
                {/* Day name */}
                <span
                  className={`text-xs font-medium uppercase ${
                    isDisabled ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {formatDateFr(day, "EEE")}
                </span>

                {/* Day number */}
                <span
                  className={`text-lg font-semibold mt-1 ${
                    isCurrentDay
                      ? "text-accent"
                      : isDisabled
                      ? "text-gray-400"
                      : "text-gray-900"
                  }`}
                >
                  {format(day, "d")}
                </span>

                {/* Trip indicators */}
                {!isDisabled && (
                  <div className="flex flex-col gap-1 mt-2 w-full">
                    {/* Aller */}
                    <div
                      className={`flex items-center justify-center gap-0.5 px-1 py-0.5 rounded text-xs ${
                        aller ? getStatusColor(aller.status) : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      <Car className="w-3 h-3" />
                      <span className="text-[10px]">→</span>
                    </div>

                    {/* Retour */}
                    <div
                      className={`flex items-center justify-center gap-0.5 px-1 py-0.5 rounded text-xs ${
                        retour ? getStatusColor(retour.status) : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      <Car className="w-3 h-3" />
                      <span className="text-[10px]">←</span>
                    </div>
                  </div>
                )}

                {/* Holiday/Vacation label */}
                {isDisabled && dayStatus.label && (
                  <span className="absolute -bottom-1 left-0 right-0 text-[8px] text-gray-400 truncate px-1">
                    {dayStatus.label.split(" ")[0]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 pb-4">
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-success" />
            <span>Confirmé</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-warning" />
            <span>Planifié</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-danger" />
            <span>Annulé</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gray-200" />
            <span>Non assigné</span>
          </div>
        </div>
      </div>
    </div>
  );
}
