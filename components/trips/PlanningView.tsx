"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  RotateCcw,
  Copy,
  Check,
  Car,
  Loader2,
  Sparkles,
} from "lucide-react";
import { format, startOfWeek, addDays, subWeeks } from "date-fns";
import toast from "react-hot-toast";
import { Avatar } from "@/components/ui";
import { DriverSelect } from "./DriverSelect";
import {
  generateRotation,
  copyPreviousWeek,
  calculateWeekStats,
} from "@/lib/rotation";
import { isSchoolDay, formatDateFr } from "@/lib/calendar-utils";
import { createBrowserClient } from "@/lib/supabase/client";
import type { CalendarDriver, RawTrip } from "@/types";
import { DAY_KEYS, DAY_LABELS } from "@/lib/constants";

interface Assignment {
  date: Date;
  direction: "aller" | "retour";
  driverId: string;
  driverName: string | null;
}

interface PlanningViewProps {
  isOpen: boolean;
  onClose: () => void;
  weekStart: Date;
  drivers: CalendarDriver[];
  groupId: string;
  existingTrips: RawTrip[];
}

export function PlanningView({
  isOpen,
  onClose,
  weekStart,
  drivers,
  groupId,
  existingTrips,
}: PlanningViewProps) {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Map<string, Assignment>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [driverSelectOpen, setDriverSelectOpen] = useState<{
    dayIndex: number;
    direction: "aller" | "retour";
  } | null>(null);

  // Initialize assignments from existing trips
  useEffect(() => {
    if (isOpen) {
      const initial = new Map<string, Assignment>();

      existingTrips.forEach((trip) => {
        if (trip.driver_id) {
          const driver = drivers.find((d) => d.id === trip.driver_id);
          const direction =
            trip.direction === "to_school" ? "aller" : "retour";
          const key = `${trip.date}-${direction}`;

          initial.set(key, {
            date: new Date(trip.date),
            direction,
            driverId: trip.driver_id,
            driverName: driver?.display_name || null,
          });
        }
      });

      setAssignments(initial);
    }
  }, [isOpen, existingTrips, drivers]);

  if (!isOpen) return null;

  const mondayStart = startOfWeek(weekStart, { weekStartsOn: 1 });

  // Calculate week stats from current assignments
  const weekStats = calculateWeekStats(Array.from(assignments.values()));

  // Get assignment for a specific cell
  function getAssignment(
    dayIndex: number,
    direction: "aller" | "retour"
  ): Assignment | undefined {
    const date = addDays(mondayStart, dayIndex);
    const dateStr = format(date, "yyyy-MM-dd");
    const key = `${dateStr}-${direction}`;
    return assignments.get(key);
  }

  // Set assignment for a specific cell
  function setAssignment(
    dayIndex: number,
    direction: "aller" | "retour",
    driverId: string
  ) {
    const date = addDays(mondayStart, dayIndex);
    const dateStr = format(date, "yyyy-MM-dd");
    const key = `${dateStr}-${direction}`;

    const newAssignments = new Map(assignments);

    if (driverId) {
      const driver = drivers.find((d) => d.id === driverId);
      newAssignments.set(key, {
        date,
        direction,
        driverId,
        driverName: driver?.display_name || null,
      });
    } else {
      newAssignments.delete(key);
    }

    setAssignments(newAssignments);
  }

  // Generate automatic rotation
  async function handleAutoRotation() {
    setIsLoading(true);

    try {
      const supabase = createBrowserClient();

      // Fetch history from past 4 weeks
      const fourWeeksAgo = format(subWeeks(mondayStart, 4), "yyyy-MM-dd");
      const weekEnd = format(addDays(mondayStart, -1), "yyyy-MM-dd");

      const { data: historyData } = await supabase
        .from("trips")
        .select("driver_id, date, direction")
        .eq("group_id", groupId)
        .gte("date", fourWeeksAgo)
        .lte("date", weekEnd)
        .not("driver_id", "is", null);

      const history = (historyData || []).map((t) => ({
        driver_id: t.driver_id!,
        date: t.date,
        direction:
          t.direction === "to_school"
            ? ("aller" as const)
            : ("retour" as const),
      }));

      // Generate rotation
      const rotation = generateRotation(drivers, mondayStart, history);

      // Apply rotation to assignments
      const newAssignments = new Map<string, Assignment>();

      rotation.forEach((r) => {
        const dateStr = format(r.date, "yyyy-MM-dd");
        const key = `${dateStr}-${r.direction}`;
        newAssignments.set(key, r);
      });

      setAssignments(newAssignments);
      toast.success("Rotation automatique appliquée");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la génération");
    } finally {
      setIsLoading(false);
    }
  }

  // Copy previous week
  async function handleCopyPreviousWeek() {
    setIsLoading(true);

    try {
      const supabase = createBrowserClient();

      const previousWeekStart = subWeeks(mondayStart, 1);
      const previousWeekEnd = addDays(previousWeekStart, 4);

      const { data: previousTrips } = await supabase
        .from("trips")
        .select("driver_id, date, direction")
        .eq("group_id", groupId)
        .gte("date", format(previousWeekStart, "yyyy-MM-dd"))
        .lte("date", format(previousWeekEnd, "yyyy-MM-dd"))
        .not("driver_id", "is", null);

      if (!previousTrips || previousTrips.length === 0) {
        toast.error("Aucun trajet la semaine précédente");
        return;
      }

      const history = previousTrips.map((t) => ({
        driver_id: t.driver_id!,
        date: t.date,
        direction:
          t.direction === "to_school"
            ? ("aller" as const)
            : ("retour" as const),
      }));

      const copied = copyPreviousWeek(history, mondayStart, drivers);

      const newAssignments = new Map<string, Assignment>();

      copied.forEach((r) => {
        const dateStr = format(r.date, "yyyy-MM-dd");
        const key = `${dateStr}-${r.direction}`;
        newAssignments.set(key, r);
      });

      setAssignments(newAssignments);
      toast.success("Semaine précédente copiée");
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la copie");
    } finally {
      setIsLoading(false);
    }
  }

  // Save all assignments
  async function handleSave() {
    setIsSaving(true);

    try {
      const supabase = createBrowserClient();

      // Process each day
      for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
        const date = addDays(mondayStart, dayIndex);
        const dateStr = format(date, "yyyy-MM-dd");

        if (!isSchoolDay(date)) continue;

        for (const direction of ["aller", "retour"] as const) {
          const key = `${dateStr}-${direction}`;
          const assignment = assignments.get(key);
          const dbDirection =
            direction === "aller" ? "to_school" : "from_school";

          // Find existing trip
          const existingTrip = existingTrips.find(
            (t) => t.date === dateStr && t.direction === dbDirection
          );

          if (assignment) {
            const driver = drivers.find((d) => d.id === assignment.driverId);

            if (existingTrip) {
              // Update existing trip
              await supabase
                .from("trips")
                .update({
                  driver_id: assignment.driverId,
                  status: "planned",
                  available_seats: driver?.max_passengers || 4,
                })
                .eq("id", existingTrip.id);
            } else {
              // Create new trip
              await supabase.from("trips").insert({
                group_id: groupId,
                driver_id: assignment.driverId,
                date: dateStr,
                direction: dbDirection,
                status: "planned",
                available_seats: driver?.max_passengers || 4,
              });
            }
          } else if (existingTrip && existingTrip.driver_id) {
            // Remove driver from existing trip
            await supabase
              .from("trips")
              .update({
                driver_id: null,
                status: "unassigned",
              })
              .eq("id", existingTrip.id);
          }
        }
      }

      // Notify group about the planning update
      try {
        await fetch("/api/push/notify-group", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            groupId,
            type: "trip_update" as const,
            tripDate: format(mondayStart, "yyyy-MM-dd"),
            tripDirection: "to_school",
            driverName: "Planification",
          }),
        });
      } catch (notifyError) {
        console.error("Failed to notify group:", notifyError);
      }

      toast.success("Semaine planifiée avec succès !");
      router.refresh();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  }

  function openDriverSelect(dayIndex: number, direction: "aller" | "retour") {
    setDriverSelectOpen({ dayIndex, direction });
  }

  function handleDriverSelected(driverId: string) {
    if (driverSelectOpen) {
      setAssignment(
        driverSelectOpen.dayIndex,
        driverSelectOpen.direction,
        driverId
      );
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-100 z-[60] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-gray-500 hover:text-gray-700"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="text-center">
          <h1 className="font-semibold text-gray-900">Planifier la semaine</h1>
          <p className="text-sm text-gray-500">
            {formatDateFr(mondayStart, "d MMM")} -{" "}
            {formatDateFr(addDays(mondayStart, 4), "d MMM yyyy")}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1 px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          Valider
        </button>
      </header>

      {/* Action buttons */}
      <div className="bg-white border-b px-4 py-2 flex gap-2">
        <button
          onClick={handleAutoRotation}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-accent/10 text-accent text-sm font-medium rounded-lg hover:bg-accent/20 transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          Rotation auto
        </button>
        <button
          onClick={handleCopyPreviousWeek}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          <Copy className="w-4 h-4" />
          Copier sem. -1
        </button>
        <button
          onClick={() => setAssignments(new Map())}
          disabled={isLoading}
          className="p-2 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Planning grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-6 bg-gray-50 border-b">
            <div className="p-2 text-center text-xs font-medium text-gray-500" />
            {DAY_LABELS.map((day, index) => {
              const date = addDays(mondayStart, index);
              const isSchool = isSchoolDay(date);

              return (
                <div
                  key={day}
                  className={`p-2 text-center ${
                    isSchool ? "" : "bg-gray-100"
                  }`}
                >
                  <p className="text-xs font-medium text-gray-500">{day}</p>
                  <p
                    className={`text-lg font-semibold ${
                      isSchool ? "text-gray-900" : "text-gray-400"
                    }`}
                  >
                    {format(date, "d")}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Aller row */}
          <div className="grid grid-cols-6 border-b">
            <div className="p-2 flex items-center justify-center">
              <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <Car className="w-3 h-3" />→
              </span>
            </div>
            {DAY_LABELS.map((_, index) => {
              const date = addDays(mondayStart, index);
              const isSchool = isSchoolDay(date);
              const assignment = getAssignment(index, "aller");

              return (
                <div
                  key={index}
                  className={`p-2 min-h-[80px] ${
                    isSchool ? "" : "bg-gray-100"
                  }`}
                >
                  {isSchool ? (
                    <button
                      onClick={() => openDriverSelect(index, "aller")}
                      className={`w-full h-full flex flex-col items-center justify-center rounded-lg transition-colors ${
                        assignment
                          ? "bg-primary/10 hover:bg-primary/20"
                          : "bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-200"
                      }`}
                    >
                      {assignment ? (
                        <>
                          <Avatar
                            name={assignment.driverName || "?"}
                            size="sm"
                          />
                          <span className="text-xs font-medium text-gray-900 mt-1 truncate max-w-full px-1">
                            {assignment.driverName?.split(" ")[0] || "?"}
                          </span>
                        </>
                      ) : (
                        <span className="text-2xl text-gray-300">+</span>
                      )}
                    </button>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                      —
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Retour row */}
          <div className="grid grid-cols-6">
            <div className="p-2 flex items-center justify-center">
              <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <Car className="w-3 h-3" />←
              </span>
            </div>
            {DAY_LABELS.map((_, index) => {
              const date = addDays(mondayStart, index);
              const isSchool = isSchoolDay(date);
              const assignment = getAssignment(index, "retour");

              return (
                <div
                  key={index}
                  className={`p-2 min-h-[80px] ${
                    isSchool ? "" : "bg-gray-100"
                  }`}
                >
                  {isSchool ? (
                    <button
                      onClick={() => openDriverSelect(index, "retour")}
                      className={`w-full h-full flex flex-col items-center justify-center rounded-lg transition-colors ${
                        assignment
                          ? "bg-secondary/10 hover:bg-secondary/20"
                          : "bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-200"
                      }`}
                    >
                      {assignment ? (
                        <>
                          <Avatar
                            name={assignment.driverName || "?"}
                            size="sm"
                          />
                          <span className="text-xs font-medium text-gray-900 mt-1 truncate max-w-full px-1">
                            {assignment.driverName?.split(" ")[0] || "?"}
                          </span>
                        </>
                      ) : (
                        <span className="text-2xl text-gray-300">+</span>
                      )}
                    </button>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                      —
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Driver stats */}
        <div className="mt-4 bg-white rounded-xl shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-3">
            Répartition de la semaine
          </h3>
          <div className="space-y-2">
            {drivers.map((driver) => {
              const stats = weekStats.get(driver.id) || {
                aller: 0,
                retour: 0,
                total: 0,
              };

              return (
                <div
                  key={driver.id}
                  className="flex items-center gap-3"
                >
                  <Avatar name={driver.display_name || "?"} size="sm" />
                  <span className="flex-1 text-sm font-medium text-gray-900">
                    {driver.display_name || "Conducteur"}
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded">
                      {stats.aller}→
                    </span>
                    <span className="px-2 py-0.5 bg-secondary/10 text-secondary rounded">
                      {stats.retour}←
                    </span>
                    <span className="font-medium text-gray-700">
                      = {stats.total}
                    </span>
                  </div>
                </div>
              );
            })}

            {drivers.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-2">
                Aucun conducteur
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Driver select bottom sheet */}
      {driverSelectOpen && (
        <DriverSelect
          isOpen={true}
          onClose={() => setDriverSelectOpen(null)}
          onSelect={handleDriverSelected}
          drivers={drivers}
          weekStats={weekStats}
          selectedDriverId={
            getAssignment(
              driverSelectOpen.dayIndex,
              driverSelectOpen.direction
            )?.driverId
          }
          dayKey={DAY_KEYS[driverSelectOpen.dayIndex]}
          direction={driverSelectOpen.direction}
        />
      )}
    </div>
  );
}
