"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { format, startOfWeek, addWeeks } from "date-fns";
import { Calendar } from "lucide-react";
import toast from "react-hot-toast";
import { PageShell } from "@/components/layout";
import { WeekView, DayDetail } from "@/components/calendar";
import { PlanningView } from "@/components/trips";
import { PullToRefresh, EmptyState } from "@/components/ui";
import { getCurrentPeriod, formatDateFr } from "@/lib/calendar-utils";
import { createBrowserClient } from "@/lib/supabase/client";
import type { CalendarTrip, CalendarDriver, CalendarChild, RawTrip } from "@/types";

interface CalendarClientProps {
  trips: CalendarTrip[];
  drivers: CalendarDriver[];
  groupChildren: CalendarChild[];
  groupId: string;
  rawTrips: RawTrip[];
}

export function CalendarClient({
  trips,
  drivers,
  groupChildren,
  groupId,
  rawTrips,
}: CalendarClientProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showPlanning, setShowPlanning] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [localTrips, setLocalTrips] = useState(trips);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const periodInfo = getCurrentPeriod(new Date());

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      router.refresh();
      // Small delay to show the refresh animation
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success("Données actualisées");
    } catch {
      toast.error("Erreur lors de l'actualisation");
    } finally {
      setIsRefreshing(false);
    }
  }, [router]);

  // Subscribe to realtime updates
  useEffect(() => {
    const supabase = createBrowserClient();

    const channel = supabase
      .channel("trips-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trips",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          // Debounce to avoid rapid successive refreshes
          if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
          }
          refreshTimeoutRef.current = setTimeout(() => {
            router.refresh();
          }, 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [groupId, router]);

  // Update local trips when props change
  useEffect(() => {
    setLocalTrips(trips);
  }, [trips]);

  // Get trips for selected date
  const selectedDateTrips = selectedDate
    ? localTrips.filter((t) => t.date === format(selectedDate, "yyyy-MM-dd"))
    : [];

  // Transform trips for WeekView (simplified format)
  const weekViewTrips = localTrips.map((t) => ({
    id: t.id,
    date: t.date,
    direction: t.direction,
    status: t.status,
    driver: t.driver
      ? { id: t.driver.id, display_name: t.driver.display_name }
      : undefined,
  }));

  // Get raw trips for the current planning week
  const planningWeekEnd = format(addWeeks(currentWeekStart, 1), "yyyy-MM-dd");
  const planningWeekStart = format(currentWeekStart, "yyyy-MM-dd");
  const planningTrips = rawTrips.filter(
    (t) => t.date >= planningWeekStart && t.date < planningWeekEnd
  );

  function handleDayClick(date: Date) {
    setSelectedDate(date);
  }

  function handleCloseDetail() {
    setSelectedDate(null);
  }

  function handleWeekChange(weekStart: Date) {
    setCurrentWeekStart(weekStart);
  }

  // Check if we have upcoming trips this week
  const upcomingTrips = localTrips.filter((t) => new Date(t.date) >= new Date());
  const hasNoTrips = localTrips.length === 0;
  const hasNoUpcoming = upcomingTrips.length === 0;

  return (
    <PageShell
      title="Calendrier"
      action={
        <button
          onClick={() => setShowPlanning(true)}
          className="flex items-center gap-1 px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label="Planifier les trajets"
        >
          <Calendar className="w-4 h-4" aria-hidden="true" />
          Planifier
        </button>
      }
    >
      <PullToRefresh onRefresh={handleRefresh} disabled={isRefreshing}>
        <div className="space-y-4">
          {/* Period status banner */}
          {periodInfo.type === "vacation" && (
            <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 text-center" role="status">
              <p className="font-medium text-accent">{periodInfo.name}</p>
              <p className="text-sm text-accent/80 mt-1">
                Reprise le {periodInfo.nextDate && formatDateFr(periodInfo.nextDate, "EEEE d MMMM")}
              </p>
            </div>
          )}

          {/* Week View */}
          <WeekView
            trips={weekViewTrips}
            onDayClick={handleDayClick}
            onWeekChange={handleWeekChange}
          />

          {/* Empty state for no trips */}
          {hasNoTrips && (
            <div className="bg-white rounded-xl shadow-sm">
              <EmptyState
                type="calendar"
                action={{
                  label: "Planifier la semaine",
                  onClick: () => setShowPlanning(true),
                }}
              />
            </div>
          )}

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-2xl font-bold text-primary">
                {drivers.length}
              </p>
              <p className="text-sm text-gray-500">Conducteurs actifs</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-2xl font-bold text-secondary">
                {groupChildren.length}
              </p>
              <p className="text-sm text-gray-500">Enfants inscrits</p>
            </div>
          </div>

          {/* Upcoming trips preview */}
          {!hasNoTrips && (
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Prochains trajets</h3>
              {hasNoUpcoming ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Aucun trajet à venir
                </p>
              ) : (
                <div className="space-y-2">
                  {upcomingTrips.slice(0, 3).map((trip) => (
                    <button
                      key={trip.id}
                      onClick={() => setSelectedDate(new Date(trip.date))}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
                      aria-label={`Voir le trajet du ${formatDateFr(new Date(trip.date), "EEEE d MMMM")}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            trip.status === "confirmed"
                              ? "bg-success"
                              : trip.status === "planned"
                              ? "bg-warning"
                              : "bg-gray-300"
                          }`}
                          aria-hidden="true"
                        />
                        <div className="text-left">
                          <p className="font-medium text-gray-900">
                            {formatDateFr(new Date(trip.date), "EEE d MMM")}
                          </p>
                          <p className="text-xs text-gray-500">
                            {trip.direction === "aller" ? "Aller" : "Retour"} — {trip.driver?.display_name || "Non assigné"}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">
                        {trip.passengers.length} passager{trip.passengers.length > 1 ? "s" : ""}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </PullToRefresh>

      {/* Day Detail Modal */}
      {selectedDate && (
        <DayDetail
          isOpen={!!selectedDate}
          onClose={handleCloseDetail}
          date={selectedDate}
          trips={selectedDateTrips}
          drivers={drivers}
          groupChildren={groupChildren}
          groupId={groupId}
        />
      )}

      {/* Planning View */}
      <PlanningView
        isOpen={showPlanning}
        onClose={() => setShowPlanning(false)}
        weekStart={currentWeekStart}
        drivers={drivers}
        groupId={groupId}
        existingTrips={planningTrips}
      />
    </PageShell>
  );
}
