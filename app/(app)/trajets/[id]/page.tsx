import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Détails du trajet",
};

export default function TrajetDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-display font-bold text-primary mb-6">
        Détails du trajet
      </h1>
      <div className="bg-white rounded-xl shadow-sm p-6">
        <p className="text-gray-500">
          Détails du trajet {params.id} à implémenter
        </p>
      </div>
    </div>
  );
}
