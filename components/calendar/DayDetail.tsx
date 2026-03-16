"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Car,
  Users,
  Clock,
  Plus,
  Check,
  AlertCircle,
  Loader2,
  ChevronRight,
  UserMinus,
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { Modal, Avatar, ConfirmModal } from "@/components/ui";
import { formatDateFr, getDayStatus } from "@/lib/calendar-utils";
import { createBrowserClient } from "@/lib/supabase/client";
import type { CalendarTrip, CalendarDriver, CalendarChild, CalendarTripPassenger } from "@/types";

interface DayDetailProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  trips: CalendarTrip[];
  drivers: CalendarDriver[];
  groupChildren: CalendarChild[];
  groupId: string;
}

export function DayDetail({
  isOpen,
  onClose,
  date,
  trips,
  drivers,
  groupChildren,
  groupId,
}: DayDetailProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showDriverSelect, setShowDriverSelect] = useState<"aller" | "retour" | null>(null);
  const [showChildSelect, setShowChildSelect] = useState<string | null>(null);
  const [editingTime, setEditingTime] = useState<string | null>(null);
  const [timeValue, setTimeValue] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    type: "cancelTrip" | "removeDriver" | "removePassenger";
    title: string;
    message: React.ReactNode;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const dayStatus = getDayStatus(date);
  const dateStr = format(date, "yyyy-MM-dd");

  const allerTrip = trips.find((t) => t.direction === "aller");
  const retourTrip = trips.find((t) => t.direction === "retour");

  function getStatusBadge(status: CalendarTrip["status"]) {
    switch (status) {
      case "confirmed":
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-success/10 text-success text-xs font-medium rounded-full">
            <Check className="w-3 h-3" />
            Confirmé
          </span>
        );
      case "planned":
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-warning/10 text-warning text-xs font-medium rounded-full">
            <Clock className="w-3 h-3" />
            Planifié
          </span>
        );
      case "cancelled":
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-danger/10 text-danger text-xs font-medium rounded-full">
            <X className="w-3 h-3" />
            Annulé
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
            <AlertCircle className="w-3 h-3" />
            Non assigné
          </span>
        );
    }
  }

  async function assignDriver(direction: "aller" | "retour", driverId: string) {
    setIsLoading(true);
    const supabase = createBrowserClient();

    try {
      const driver = drivers.find((d) => d.id === driverId);
      if (!driver) throw new Error("Conducteur non trouvé");

      // Check if trip exists
      const existingTrip = direction === "aller" ? allerTrip : retourTrip;

      if (existingTrip) {
        // Update existing trip
        const { error } = await supabase
          .from("trips")
          .update({
            driver_id: driverId,
            status: "planned",
            available_seats: driver.max_passengers,
          })
          .eq("id", existingTrip.id);

        if (error) throw error;
      } else {
        // Create new trip
        const { error } = await supabase.from("trips").insert({
          group_id: groupId,
          driver_id: driverId,
          date: dateStr,
          direction: direction === "aller" ? "to_school" : "from_school",
          status: "planned",
          available_seats: driver.max_passengers,
        });

        if (error) throw error;
      }

      // Notify group
      try {
        await fetch("/api/push/notify-group", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            groupId,
            type: "driver_assigned",
            tripDate: dateStr,
            tripDirection: direction === "aller" ? "to_school" : "from_school",
            driverName: driver.display_name || "Un conducteur",
          }),
        });
      } catch (notifyError) {
        console.error("Failed to notify group:", notifyError);
      }

      toast.success("Conducteur assigné");
      setShowDriverSelect(null);
      router.refresh();
    } catch (error: unknown) {
      console.error("Erreur assignDriver:", error);
      const err = error as { message?: string; details?: string; hint?: string };
      const message = err.message || err.details || err.hint || "Une erreur est survenue";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  function changeDriver(direction: "aller" | "retour") {
    setShowDriverSelect(direction);
  }

  async function updateDepartureTime(tripId: string) {
    if (!timeValue) return;
    setIsLoading(true);
    const supabase = createBrowserClient();

    try {
      const { error } = await supabase
        .from("trips")
        .update({ departure_time: timeValue })
        .eq("id", tripId);

      if (error) throw error;

      toast.success("Heure de départ modifiée");
      setEditingTime(null);
      setTimeValue("");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  }

  async function addPassenger(tripId: string, childId: string) {
    setIsLoading(true);
    const supabase = createBrowserClient();

    try {
      const { error } = await supabase.from("trip_passengers").insert({
        trip_id: tripId,
        child_id: childId,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Enfant ajouté au trajet");
      setShowChildSelect(null);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  }

  function requestRemovePassenger(trip: CalendarTrip, passenger: CalendarTripPassenger) {
    const childName = `${passenger.child.first_name} ${passenger.child.last_name || ""}`.trim();
    const directionLabel = trip.direction === "aller" ? "aller" : "retour";
    setConfirmAction({
      type: "removePassenger",
      title: "Retirer le passager",
      message: (<>Voulez-vous retirer {childName} du trajet <strong>{directionLabel}</strong> ?</>),
      onConfirm: async () => {
        setIsLoading(true);
        const supabase = createBrowserClient();

        try {
          const { error } = await supabase
            .from("trip_passengers")
            .delete()
            .eq("id", passenger.id);

          if (error) throw error;

          // Notify other drivers in the group
          try {
            await fetch("/api/push/notify-group", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                groupId,
                type: "child_removed",
                tripDate: trip.date,
                tripDirection: trip.direction === "aller" ? "to_school" : "from_school",
                childName,
              }),
            });
          } catch (notifyError) {
            console.error("Failed to notify group:", notifyError);
          }

          toast.success("Enfant retiré du trajet");
          setConfirmAction(null);
          router.refresh();
        } catch (error) {
          console.error(error);
          toast.error("Une erreur est survenue");
        } finally {
          setIsLoading(false);
        }
      },
    });
  }

  async function confirmTrip(trip: CalendarTrip) {
    setIsLoading(true);
    const supabase = createBrowserClient();

    try {
      const { error } = await supabase
        .from("trips")
        .update({ status: "confirmed" })
        .eq("id", trip.id);

      if (error) throw error;

      // Notify group
      try {
        await fetch("/api/push/notify-group", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            groupId,
            type: "trip_confirmed",
            tripDate: trip.date,
            tripDirection: trip.direction === "aller" ? "to_school" : "from_school",
          }),
        });
      } catch (notifyError) {
        console.error("Failed to notify group:", notifyError);
      }

      toast.success("Trajet confirmé");
      router.refresh();
    } catch (error: unknown) {
      console.error("Erreur confirmTrip:", error);
      const err = error as { message?: string };
      toast.error(err.message || "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  }

  function requestCancelTrip(trip: CalendarTrip) {
    const directionLabel = trip.direction === "aller" ? "aller" : "retour";
    setConfirmAction({
      type: "cancelTrip",
      title: "Annuler le trajet",
      message: (<>Voulez-vous annuler le trajet <strong>{directionLabel}</strong> ? Tous les passagers seront notifiés.</>),
      onConfirm: async () => {
        setIsLoading(true);
        const supabase = createBrowserClient();

        try {
          const { error } = await supabase
            .from("trips")
            .update({ status: "cancelled" })
            .eq("id", trip.id);

          if (error) throw error;

          // Notify other drivers in the group
          try {
            await fetch("/api/push/notify-group", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                groupId,
                type: "trip_cancelled",
                tripDate: trip.date,
                tripDirection: trip.direction === "aller" ? "to_school" : "from_school",
              }),
            });
          } catch (notifyError) {
            console.error("Failed to notify group:", notifyError);
          }

          toast.success("Trajet annulé");
          setConfirmAction(null);
          router.refresh();
        } catch (error: unknown) {
          console.error("Erreur cancelTrip:", error);
          const err = error as { message?: string };
          toast.error(err.message || "Une erreur est survenue");
        } finally {
          setIsLoading(false);
        }
      },
    });
  }

  function requestRemoveDriver(trip: CalendarTrip) {
    const driverName = trip.driver?.display_name || "le conducteur";
    const directionLabel = trip.direction === "aller" ? "aller" : "retour";
    setConfirmAction({
      type: "removeDriver",
      title: "Retirer le conducteur",
      message: (<>Voulez-vous retirer {driverName} du trajet <strong>{directionLabel}</strong> ? Les autres conducteurs seront notifiés.</>),
      onConfirm: async () => {
        setIsLoading(true);
        const supabase = createBrowserClient();

        try {
          const { error } = await supabase
            .from("trips")
            .update({ driver_id: null, status: "planned" })
            .eq("id", trip.id);

          if (error) throw error;

          // Notify other drivers in the group
          try {
            await fetch("/api/push/notify-group", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                groupId,
                type: "driver_removed",
                tripDate: trip.date,
                tripDirection: trip.direction === "aller" ? "to_school" : "from_school",
                driverName: trip.driver?.display_name || "Un conducteur",
              }),
            });
          } catch (notifyError) {
            console.error("Failed to notify group:", notifyError);
          }

          toast.success("Conducteur retiré");
          setConfirmAction(null);
          router.refresh();
        } catch (error: unknown) {
          console.error("Erreur removeDriver:", error);
          const err = error as { message?: string };
          toast.error(err.message || "Une erreur est survenue");
        } finally {
          setIsLoading(false);
        }
      },
    });
  }

  function renderTrip(trip: CalendarTrip | undefined, direction: "aller" | "retour") {
    const label = direction === "aller" ? "Aller" : "Retour";
    const icon = direction === "aller" ? "→" : "←";

    return (
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            <span className="font-semibold text-gray-900">
              {label} {icon}
            </span>
          </div>
          {trip && getStatusBadge(trip.status)}
        </div>

        {trip?.driver ? (
          <>
            {/* Driver info */}
            <div className="flex items-center gap-3 mb-3">
              <Avatar name={trip.driver.display_name || "Conducteur"} size="md" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  {trip.driver.display_name || "Conducteur"}
                </p>
                {trip.driver.vehicle_model && (
                  <p className="text-sm text-gray-500">
                    {[trip.driver.vehicle_model, trip.driver.vehicle_color]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Users className="w-4 h-4" />
                  <span>
                    {trip.passengers.length}/{trip.available_seats}
                  </span>
                </div>
                <button
                  onClick={() => changeDriver(direction)}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50"
                  aria-label="Changer le conducteur"
                >
                  Changer
                </button>
                <button
                  onClick={() => requestRemoveDriver(trip)}
                  disabled={isLoading}
                  className="p-1.5 text-gray-400 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors disabled:opacity-50"
                  aria-label="Retirer le conducteur"
                >
                  <UserMinus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Departure time */}
            <div className="flex items-center gap-2 mb-3 text-sm">
              <Clock className="w-4 h-4 text-gray-400" />
              {editingTime === trip.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={timeValue}
                    onChange={(e) => setTimeValue(e.target.value)}
                    className="input py-1 px-2 text-sm flex-1"
                    autoFocus
                  />
                  <button
                    onClick={() => updateDepartureTime(trip.id)}
                    disabled={isLoading || !timeValue}
                    className="px-2 py-1 bg-primary text-white text-xs rounded-lg disabled:opacity-50"
                  >
                    OK
                  </button>
                  <button
                    onClick={() => { setEditingTime(null); setTimeValue(""); }}
                    className="px-2 py-1 text-gray-500 text-xs"
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditingTime(trip.id);
                    setTimeValue(trip.departure_time || "");
                  }}
                  className="text-gray-600 hover:text-primary transition-colors"
                >
                  {trip.departure_time
                    ? `Départ à ${trip.departure_time.slice(0, 5)}`
                    : "Ajouter l'heure de départ"}
                </button>
              )}
            </div>

            {/* Passengers */}
            <div className="space-y-2 mb-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Passagers
              </p>
              {trip.passengers.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Aucun passager</p>
              ) : (
                trip.passengers.map((passenger) => (
                  <div
                    key={passenger.id}
                    className="flex items-center justify-between bg-white rounded-lg p-2"
                  >
                    <span className="text-sm text-gray-900">
                      {passenger.child.first_name} {passenger.child.last_name}
                    </span>
                    <button
                      onClick={() => requestRemovePassenger(trip, passenger)}
                      className="text-gray-400 hover:text-danger transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add passenger button */}
            {trip.passengers.length < trip.available_seats && (
              <>
                {showChildSelect === trip.id ? (
                  <div className="space-y-2">
                    {groupChildren
                      .filter(
                        (c) => !trip.passengers.some((p) => p.child.id === c.id)
                      )
                      .map((child) => (
                        <button
                          key={child.id}
                          onClick={() => addPassenger(trip.id, child.id)}
                          disabled={isLoading}
                          className="w-full flex items-center justify-between p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <span className="text-sm">
                            {child.first_name} {child.last_name}
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </button>
                      ))}
                    <button
                      onClick={() => setShowChildSelect(null)}
                      className="w-full text-sm text-gray-500 py-2"
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowChildSelect(trip.id)}
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un enfant
                  </button>
                )}
              </>
            )}

            {/* Driver select for changing driver */}
            {showDriverSelect === direction && (
              <div className="space-y-2 mb-3 p-3 bg-white rounded-lg border border-primary/20">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Changer le conducteur</p>
                {drivers.map((driver) => (
                  <button
                    key={driver.id}
                    onClick={() => assignDriver(direction, driver.id)}
                    disabled={isLoading}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Avatar name={driver.display_name || "Conducteur"} size="sm" />
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900 text-sm">
                        {driver.display_name || "Conducteur"}
                      </p>
                      {driver.vehicle_model && (
                        <p className="text-xs text-gray-500">{driver.vehicle_model}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">{driver.max_passengers} places</span>
                  </button>
                ))}
                <button
                  onClick={() => setShowDriverSelect(null)}
                  className="w-full text-sm text-gray-500 py-1"
                >
                  Annuler
                </button>
              </div>
            )}

            {/* Action buttons */}
            {trip.status === "planned" && (
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200">
                <button
                  onClick={() => confirmTrip(trip)}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-success text-white font-medium rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  Confirmer
                </button>
                <button
                  onClick={() => requestCancelTrip(trip)}
                  disabled={isLoading}
                  className="px-4 py-2 text-danger hover:bg-danger/10 font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
              </div>
            )}

            {trip.status === "confirmed" && (
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200">
                <button
                  onClick={() => requestCancelTrip(trip)}
                  disabled={isLoading}
                  className="flex-1 py-2 text-danger hover:bg-danger/10 font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  Annuler le trajet
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* No driver assigned */}
            {showDriverSelect === direction ? (
              <div className="space-y-2">
                {drivers.map((driver) => (
                  <button
                    key={driver.id}
                    onClick={() => assignDriver(direction, driver.id)}
                    disabled={isLoading}
                    className="w-full flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Avatar name={driver.display_name || "Conducteur"} size="sm" />
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">
                        {driver.display_name || "Conducteur"}
                      </p>
                      {driver.vehicle_model && (
                        <p className="text-xs text-gray-500">
                          {driver.vehicle_model}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {driver.max_passengers} places
                    </span>
                  </button>
                ))}
                <button
                  onClick={() => setShowDriverSelect(null)}
                  className="w-full text-sm text-gray-500 py-2"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDriverSelect(direction)}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary hover:text-primary transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Assigner un conducteur</span>
              </button>
            )}
          </>
        )}
      </div>
    );
  }

  return (
  <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={formatDateFr(date, "EEEE d MMMM")}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {dayStatus.type !== "school" ? (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {dayStatus.type === "weekend"
              ? "Week-end"
              : dayStatus.type === "holiday"
              ? dayStatus.label
              : dayStatus.label}
          </p>
          <p className="text-sm text-gray-400 mt-1">Pas de trajet ce jour</p>
        </div>
      ) : (
        <div className="space-y-4">
          {renderTrip(allerTrip, "aller")}
          {renderTrip(retourTrip, "retour")}
        </div>
      )}
    </Modal>

    <ConfirmModal
      isOpen={confirmAction !== null}
      onClose={() => setConfirmAction(null)}
      onConfirm={() => confirmAction?.onConfirm()}
      title={confirmAction?.title || ""}
      message={confirmAction?.message || ""}
      confirmLabel={confirmAction?.type === "cancelTrip" ? "Annuler le trajet" : "Confirmer"}
      variant={confirmAction?.type === "cancelTrip" ? "danger" : "warning"}
      isLoading={isLoading}
    />
  </>
  );
}
