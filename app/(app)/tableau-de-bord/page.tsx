import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tableau de bord",
};

export default function TableauDeBordPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-display font-bold text-primary mb-6">
        Tableau de bord
      </h1>
      <div className="bg-white rounded-xl shadow-sm p-6">
        <p className="text-gray-500">
          Contenu du tableau de bord à implémenter
        </p>
      </div>
    </div>
  );
}
