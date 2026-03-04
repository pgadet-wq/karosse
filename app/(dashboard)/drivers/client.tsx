"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Car, Users, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { PageShell } from "@/components/layout";
import { Modal, Avatar, EmptyState } from "@/components/ui";
import { createBrowserClient } from "@/lib/supabase/client";

interface Driver {
  id: string;
  member_id: string;
  vehicle_model: string | null;
  vehicle_color: string | null;
  license_plate: string | null;
  max_passengers: number;
  is_active: boolean;
  members: {
    id: string;
    user_id: string;
    display_name: string | null;
    group_id: string;
  };
}

interface Member {
  id: string;
  group_id: string;
  display_name: string | null;
  is_driver: boolean;
}

interface DriversClientProps {
  drivers: Driver[];
  currentMember: Member;
  userId: string;
}

const DAYS = [
  { key: "lun", label: "Lun" },
  { key: "mar", label: "Mar" },
  { key: "mer", label: "Mer" },
  { key: "jeu", label: "Jeu" },
  { key: "ven", label: "Ven" },
];

export function DriversClient({ drivers, currentMember, userId }: DriversClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [maxPassengers, setMaxPassengers] = useState(4);

  // Check if current user is already a driver
  const currentUserDriver = drivers.find(
    (d) => d.members.user_id === userId
  );

  function openAddModal() {
    setEditingDriver(null);
    setVehicleModel("");
    setVehicleColor("");
    setMaxPassengers(4);
    setIsModalOpen(true);
  }

  function openEditModal(driver: Driver) {
    setEditingDriver(driver);
    setVehicleModel(driver.vehicle_model || "");
    setVehicleColor(driver.vehicle_color || "");
    setMaxPassengers(driver.max_passengers);
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    const supabase = createBrowserClient();

    try {
      if (editingDriver) {
        // Update existing driver
        const { error } = await supabase
          .from("drivers")
          .update({
            vehicle_model: vehicleModel || null,
            vehicle_color: vehicleColor || null,
            max_passengers: maxPassengers,
          })
          .eq("id", editingDriver.id);

        if (error) throw error;
        toast.success("Conducteur modifié");
      } else {
        // Create new driver
        const { error } = await supabase.from("drivers").insert({
          member_id: currentMember.id,
          vehicle_model: vehicleModel || null,
          vehicle_color: vehicleColor || null,
          max_passengers: maxPassengers,
        });

        if (error) throw error;

        // Update member to mark as driver
        await supabase
          .from("members")
          .update({ is_driver: true })
          .eq("id", currentMember.id);

        toast.success("Vous êtes maintenant conducteur");
      }

      setIsModalOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (!editingDriver) return;
    if (!confirm("Supprimer ce conducteur ?")) return;

    setIsLoading(true);
    const supabase = createBrowserClient();

    try {
      const { error } = await supabase
        .from("drivers")
        .delete()
        .eq("id", editingDriver.id);

      if (error) throw error;

      // Update member to mark as not driver
      await supabase
        .from("members")
        .update({ is_driver: false })
        .eq("id", editingDriver.member_id);

      toast.success("Conducteur supprimé");
      setIsModalOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <PageShell title="Conducteurs">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          {drivers.length} conducteur{drivers.length > 1 ? "s" : ""} dans le groupe
        </p>
        {!currentUserDriver && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-1 px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label="Devenir conducteur"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Devenir conducteur
          </button>
        )}
      </div>

      {/* Drivers List */}
      <div className="space-y-3">
        {drivers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm">
            <EmptyState
              type="drivers"
              action={{
                label: "Devenir conducteur",
                onClick: openAddModal,
              }}
            />
          </div>
        ) : (
          drivers.map((driver) => {
            const isCurrentUser = driver.members.user_id === userId;
            const displayName = driver.members.display_name || "Conducteur";
            const vehicleDesc = [driver.vehicle_model, driver.vehicle_color]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                key={driver.id}
                onClick={() => isCurrentUser && openEditModal(driver)}
                className={`w-full bg-white rounded-xl shadow-sm p-4 text-left transition-colors ${
                  isCurrentUser ? "hover:bg-gray-50 cursor-pointer" : "cursor-default"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={displayName} size="lg" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {displayName}
                      </h3>
                      {isCurrentUser && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                          Vous
                        </span>
                      )}
                    </div>

                    {vehicleDesc && (
                      <p className="text-sm text-gray-600 flex items-center gap-1 mt-0.5">
                        <Car className="w-4 h-4" />
                        {vehicleDesc}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-sm text-gray-500">
                        <Users className="w-4 h-4" />
                        {driver.max_passengers} places
                      </span>

                      {/* Days badges */}
                      <div className="flex gap-1">
                        {DAYS.map((day) => (
                          <span
                            key={day.key}
                            className="px-1.5 py-0.5 text-xs font-medium rounded bg-primary/10 text-primary"
                          >
                            {day.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDriver ? "Modifier conducteur" : "Devenir conducteur"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Véhicule (modèle)</label>
            <input
              type="text"
              value={vehicleModel}
              onChange={(e) => setVehicleModel(e.target.value)}
              placeholder="Ex: Toyota RAV4"
              className="input"
            />
          </div>

          <div>
            <label className="label">Couleur</label>
            <input
              type="text"
              value={vehicleColor}
              onChange={(e) => setVehicleColor(e.target.value)}
              placeholder="Ex: Gris"
              className="input"
            />
          </div>

          <div>
            <label className="label">Nombre de places disponibles</label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setMaxPassengers(Math.max(1, maxPassengers - 1))}
                className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-xl font-medium hover:border-primary hover:text-primary transition-colors"
              >
                −
              </button>
              <span className="text-2xl font-semibold w-8 text-center">
                {maxPassengers}
              </span>
              <button
                type="button"
                onClick={() => setMaxPassengers(Math.min(7, maxPassengers + 1))}
                className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-xl font-medium hover:border-primary hover:text-primary transition-colors"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            {editingDriver && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isLoading}
                className="px-4 py-2 text-danger hover:bg-danger/10 rounded-lg transition-colors"
              >
                Supprimer
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Enregistrer"
              )}
            </button>
          </div>
        </form>
      </Modal>
    </PageShell>
  );
}
