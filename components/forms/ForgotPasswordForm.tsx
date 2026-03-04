"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Loader2, ArrowLeft } from "lucide-react";
import { resetPassword } from "@/lib/supabase/actions";
import { Button } from "@/components/ui";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);

    const result = await resetPassword(formData);

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

      <p className="text-sm text-gray-600 text-center">
        Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
      </p>

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

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Envoi...
          </>
        ) : (
          "Envoyer le lien"
        )}
      </Button>

      <Link
        href="/connexion"
        className="flex items-center justify-center gap-2 text-sm text-secondary hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour à la connexion
      </Link>
    </form>
  );
}
