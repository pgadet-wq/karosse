import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/forms";

export const metadata: Metadata = {
  title: "Connexion",
};

export default function ConnexionPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center mb-6">
          <h1 className="text-3xl font-display font-bold text-primary">
            KAROSSE
          </h1>
          <p className="text-sm text-gray-500">Covoiturage scolaire Nouméa</p>
        </Link>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-center mb-6">Connexion</h2>
          <Suspense fallback={<div className="animate-pulse h-64 bg-gray-100 rounded-lg" />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
