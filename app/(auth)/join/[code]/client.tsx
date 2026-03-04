"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, Mail, Loader2, CheckCircle, School } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";

interface JoinGroupClientProps {
  group: {
    id: string;
    name: string;
    school_name: string | null;
  };
  code: string;
}

export function JoinGroupClient({ group, code }: JoinGroupClientProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Store the join code for after login
    localStorage.setItem("karosse_join_code", code);

    const supabase = createBrowserClient();
    const origin = window.location.origin;

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/join/${code}`,
      },
    });

    setIsLoading(false);

    if (authError) {
      setError(authError.message);
    } else {
      setSuccess(true);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary to-primary-700 px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold text-white mb-2">
            KAROSSE
          </h1>
          <p className="text-white/80">Covoiturage scolaire</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {/* Group Info */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{group.name}</h2>
              {group.school_name && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <School className="w-4 h-4" />
                  <span>{group.school_name}</span>
                </div>
              )}
            </div>
          </div>

          {success ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Email envoyé !
              </h3>
              <p className="text-gray-600 text-sm">
                Cliquez sur le lien dans votre boîte mail pour rejoindre le groupe.
              </p>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-center text-gray-900 mb-2">
                Rejoindre ce groupe
              </h3>
              <p className="text-gray-600 text-center text-sm mb-6">
                Connectez-vous pour rejoindre le groupe de covoiturage
              </p>

              {error && (
                <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="label">
                    Votre email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="votre@email.com"
                      className="input pl-10"
                      disabled={isLoading}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !email}
                  className="w-full py-3 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    "Se connecter pour rejoindre"
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-4">
                Déjà connecté ?{" "}
                <Link href="/calendar" className="text-secondary hover:underline">
                  Accéder à l&apos;app
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
