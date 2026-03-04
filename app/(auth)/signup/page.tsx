"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, User, Lock, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";

type AuthMode = "magic" | "password";

export default function SignupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("password");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    localStorage.setItem("karosse_signup_firstname", firstName);

    const supabase = createBrowserClient();
    const origin = window.location.origin;

    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        data: {
          first_name: firstName,
        },
      },
    });

    setIsLoading(false);

    if (authError) {
      if (authError.message.includes("rate limit")) {
        setError("Trop de tentatives. Utilisez l'inscription par mot de passe.");
      } else {
        setError(authError.message);
      }
    } else {
      setSuccess(true);
    }
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      setIsLoading(false);
      return;
    }

    localStorage.setItem("karosse_signup_firstname", firstName);

    const supabase = createBrowserClient();

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
        },
      },
    });

    setIsLoading(false);

    if (authError) {
      if (authError.message.includes("already registered")) {
        setError("Cet email est déjà utilisé. Connectez-vous.");
      } else {
        setError(authError.message);
      }
    } else {
      router.push("/onboarding");
      router.refresh();
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
          {success ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Email envoyé !
              </h2>
              <p className="text-gray-600 text-sm">
                Vérifiez votre boîte mail ! Cliquez sur le lien pour finaliser votre inscription.
              </p>
              <button
                onClick={() => {
                  setSuccess(false);
                  setEmail("");
                  setFirstName("");
                }}
                className="mt-6 text-secondary hover:underline text-sm"
              >
                Utiliser une autre adresse
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-center text-gray-900 mb-6">
                Créer un compte
              </h2>

              {/* Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
                <button
                  type="button"
                  onClick={() => setMode("password")}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                    mode === "password"
                      ? "bg-white text-primary shadow-sm"
                      : "text-gray-600"
                  }`}
                >
                  Mot de passe
                </button>
                <button
                  type="button"
                  onClick={() => setMode("magic")}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                    mode === "magic"
                      ? "bg-white text-primary shadow-sm"
                      : "text-gray-600"
                  }`}
                >
                  Lien magique
                </button>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm mb-4">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form
                onSubmit={mode === "magic" ? handleMagicLink : handlePassword}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="firstName" className="label">
                    Prénom
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      placeholder="Jean"
                      className="input pl-10"
                      disabled={isLoading}
                      autoComplete="given-name"
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

                {mode === "password" && (
                  <div>
                    <label htmlFor="password" className="label">
                      Mot de passe
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        className="input pl-10"
                        disabled={isLoading}
                        autoComplete="new-password"
                        minLength={6}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum 6 caractères
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    isLoading ||
                    !email ||
                    !firstName ||
                    (mode === "password" && !password)
                  }
                  className="w-full py-3 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {mode === "magic" ? "Envoi..." : "Création..."}
                    </>
                  ) : mode === "magic" ? (
                    "Recevoir le lien"
                  ) : (
                    "Créer mon compte"
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-gray-600 mt-6">
                Déjà un compte ?{" "}
                <Link
                  href="/login"
                  className="text-secondary font-medium hover:underline"
                >
                  Se connecter
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
