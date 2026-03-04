"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Lock, User, Loader2 } from "lucide-react";
import { signUp } from "@/lib/supabase/actions";
import { Button } from "@/components/ui";

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);

    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      setIsLoading(false);
      return;
    }

    const result = await signUp(formData);

    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="prenom" className="label">
            Prénom
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="prenom"
              name="prenom"
              type="text"
              required
              placeholder="Jean"
              className="input pl-10"
              disabled={isLoading}
            />
          </div>
        </div>

        <div>
          <label htmlFor="nom" className="label">
            Nom
          </label>
          <input
            id="nom"
            name="nom"
            type="text"
            required
            placeholder="Dupont"
            className="input"
            disabled={isLoading}
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="votre@email.com"
            className="input pl-10"
            disabled={isLoading}
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="label">
          Mot de passe
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="••••••••"
            className="input pl-10"
            disabled={isLoading}
          />
        </div>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="label">
          Confirmer le mot de passe
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            placeholder="••••••••"
            className="input pl-10"
            disabled={isLoading}
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Création...
          </>
        ) : (
          "Créer mon compte"
        )}
      </Button>

      <p className="text-center text-sm text-gray-600">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="text-secondary font-medium hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
