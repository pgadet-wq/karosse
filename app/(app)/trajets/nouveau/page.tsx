import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nouveau trajet",
};

export default function NouveauTrajetPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-display font-bold text-primary mb-6">
        Créer un nouveau trajet
      </h1>
      <div className="bg-white rounded-xl shadow-sm p-6">
        <p className="text-gray-500">
          Formulaire de création de trajet à implémenter
        </p>
      </div>
    </div>
  );
}
