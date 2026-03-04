import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mon profil",
};

export default function ProfilPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-display font-bold text-primary mb-6">
        Mon profil
      </h1>
      <div className="bg-white rounded-xl shadow-sm p-6">
        <p className="text-gray-500">
          Page de profil à implémenter
        </p>
      </div>
    </div>
  );
}
