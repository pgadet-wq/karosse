"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Loader2 } from "lucide-react";
import { signIn } from "@/lib/supabase/actions";
import { Button } from "@/components/ui";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const message = searchParams.get("message");
  const redirectTo = searchParams.get("redirect") || "/calendar";

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);

    formData.append("redirect", redirectTo);
    const result = await signIn(formData);

    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {message && (
        <div className="p-3 bg-success/10 border border-success/20 rounded-lg text-success text-sm">
          {message}
        </div>
      )}

      {error && (
        <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
          {error}
        </div>
      )}

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

      <div className="flex justify-end">
        <Link
          href="/mot-de-passe-oublie"
          className="text-sm text-secondary hover:underline"
        >
          Mot de passe oublié ?
        </Link>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Connexion...
          </>
        ) : (
          "Se connecter"
        )}
      </Button>

      <p className="text-center text-sm text-gray-600">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="text-secondary font-medium hover:underline">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}
