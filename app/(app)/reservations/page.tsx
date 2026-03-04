import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mes réservations",
};

export default function ReservationsPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-display font-bold text-primary mb-6">
        Mes réservations
      </h1>
      <div className="bg-white rounded-xl shadow-sm p-6">
        <p className="text-gray-500">
          Liste des réservations à implémenter
        </p>
      </div>
    </div>
  );
}
