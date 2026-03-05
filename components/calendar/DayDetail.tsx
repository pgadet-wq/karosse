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
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { Modal, Avatar } from "@/components/ui";
import { formatDateFr, getDayStatus } from "@/lib/calendar-utils";
import { createBrowserClient } from "@/lib/supabase/client";

interface Driver {
  id: string;
  member_id: string;
  display_name: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  max_passengers: number;
}

interface Child {
  id: string;
  first_name: string;
  last_name: string | null;
}

interface TripPassenger {
  id: string;
  child: Child;
  status: "confirmed" | "pending" | "cancelled";
}

interface Trip {
  id: string;
  date: string;
  direction: "aller" | "retour";
  status: "confirmed" | "planned" | "cancelled" | "unassigned";
  departure_time: string | null;
  available_seats: number;
  driver?: Driver;
  passengers: TripPassenger[];
}

interface DayDetailProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  trips: Trip[];
  drivers: Driver[];
  groupChildren: Child[];
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

  const dayStatus = getDayStatus(date);
  const dateStr = format(date, "yyyy-MM-dd");

  const allerTrip = trips.find((t) => t.direction === "aller");
  const retourTrip = trips.find((t) => t.direction === "retour");

  function getStatusBadge(status: Trip["status"]) {
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

  async function removePassenger(passengerId: string) {
    if (!confirm("Retirer cet enfant du trajet ?")) return;

    setIsLoading(true);
    const supabase = createBrowserClient();

    try {
      const { error } = await supabase
        .from("trip_passengers")
        .delete()
        .eq("id", passengerId);

      if (error) throw error;

      toast.success("Enfant retiré du trajet");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  }

  function renderTrip(trip: Trip | undefined, direction: "aller" | "retour") {
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
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Users className="w-4 h-4" />
                <span>
                  {trip.passengers.length}/{trip.available_seats}
                </span>
              </div>
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
                      onClick={() => removePassenger(passenger.id)}
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
  );
}
