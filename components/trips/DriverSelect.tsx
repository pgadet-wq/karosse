"use client";

import { X, Car, Users, Check } from "lucide-react";
import { Avatar } from "@/components/ui";

interface Driver {
  id: string;
  member_id: string;
  display_name: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  max_passengers: number;
  available_days: string[];
}

interface DriverSelectProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (driverId: string) => void;
  drivers: Driver[];
  weekStats: Map<string, { aller: number; retour: number; total: number }>;
  selectedDriverId?: string;
  dayKey: string;
  direction: "aller" | "retour";
}

export function DriverSelect({
  isOpen,
  onClose,
  onSelect,
  drivers,
  weekStats,
  selectedDriverId,
  dayKey,
  direction,
}: DriverSelectProps) {
  if (!isOpen) return null;

  // Filter drivers available on this day
  const availableDrivers = drivers.filter(
    (d) => d.available_days.length === 0 || d.available_days.includes(dayKey)
  );

  const unavailableDrivers = drivers.filter(
    (d) => d.available_days.length > 0 && !d.available_days.includes(dayKey)
  );

  function handleSelect(driverId: string) {
    onSelect(driverId);
    onClose();
  }

  function handleClear() {
    onSelect("");
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[55]"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-[60] max-h-[80vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold text-gray-900">
              Choisir un conducteur
            </h3>
            <p className="text-sm text-gray-500">
              {direction === "aller" ? "Trajet aller" : "Trajet retour"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Driver list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {/* Clear selection option */}
          {selectedDriverId && (
            <button
              onClick={handleClear}
              className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-gray-500"
            >
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                <X className="w-5 h-5" />
              </div>
              <span className="font-medium">Retirer l&apos;assignation</span>
            </button>
          )}

          {/* Available drivers */}
          {availableDrivers.length > 0 && (
            <>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide pt-2">
                Disponibles
              </p>
              {availableDrivers.map((driver) => {
                const stats = weekStats.get(driver.id);
                const isSelected = driver.id === selectedDriverId;
                const vehicleDesc = [driver.vehicle_model, driver.vehicle_color]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <button
                    key={driver.id}
                    onClick={() => handleSelect(driver.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      isSelected
                        ? "bg-primary/10 border-2 border-primary"
                        : "bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <Avatar
                      name={driver.display_name || "Conducteur"}
                      size="md"
                    />

                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {driver.display_name || "Conducteur"}
                        </span>
                        {isSelected && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      {vehicleDesc && (
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Car className="w-3 h-3" />
                          {vehicleDesc}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Users className="w-4 h-4" />
                        <span>{driver.max_passengers}</span>
                      </div>
                      {stats && stats.total > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {stats.total} trajet{stats.total > 1 ? "s" : ""} cette sem.
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </>
          )}

          {/* Unavailable drivers */}
          {unavailableDrivers.length > 0 && (
            <>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide pt-4">
                Non disponibles ce jour
              </p>
              {unavailableDrivers.map((driver) => (
                <div
                  key={driver.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 opacity-50"
                >
                  <Avatar
                    name={driver.display_name || "Conducteur"}
                    size="md"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-500">
                      {driver.display_name || "Conducteur"}
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}

          {drivers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Car className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p>Aucun conducteur dans le groupe</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
