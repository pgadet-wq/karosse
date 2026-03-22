"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  User,
  Users,
  UserPlus,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  School,
} from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { SCHOOLS } from "@/lib/constants";

type Step = "name" | "choice" | "create" | "join";

function OnboardingContent() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>("name");
  const [userId, setUserId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedSchool, setSelectedSchool] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);

    async function checkAuth() {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);

      // Check if user already has a member profile
      const { data: members } = await supabase
        .from("members")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (members && members.length > 0) {
        router.push("/calendar");
        return;
      }

      // Retrieve firstName from localStorage or user metadata
      const storedFirstName = localStorage.getItem("karosse_signup_firstname");
      const metaFirstName = user.user_metadata?.first_name;

      if (storedFirstName) {
        setFirstName(storedFirstName);
      } else if (metaFirstName) {
        setFirstName(metaFirstName);
      }

      setIsChecking(false);
    }

    checkAuth();
  }, [router]);

  if (!mounted || isChecking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </main>
    );
  }

  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (firstName.trim()) {
      const supabase = createBrowserClient();
      await supabase.auth.updateUser({
        data: { first_name: firstName.trim() },
      });
      setStep("choice");
    }
  }

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!userId) {
      setError("Session expirée. Veuillez vous reconnecter.");
      router.push("/login");
      return;
    }

    const supabase = createBrowserClient();

    // Generate invite code (6 alphanumeric characters, crypto-secure)
    const array = new Uint8Array(4);
    crypto.getRandomValues(array);
    const newInviteCode = Array.from(array, (b) => b.toString(36)).join("").substring(0, 6).toUpperCase();

    // Get school name
    const school = SCHOOLS.find((s) => s.id === selectedSchool);
    const schoolName = school?.id === "both"
      ? "Mariotti / Pascal"
      : school?.name || "";

    // Create the group
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .insert({
        name: groupName.trim(),
        school_name: schoolName,
        invite_code: newInviteCode,
      })
      .select()
      .single();

    if (groupError) {
      console.error("Group creation error:", groupError);
      setError("Erreur lors de la création du groupe. Veuillez réessayer.");
      setIsLoading(false);
      return;
    }

    // Create member with admin role
    const { error: memberError } = await supabase.from("members").insert({
      user_id: userId,
      group_id: group.id,
      role: "admin",
      display_name: firstName.trim(),
    });

    if (memberError) {
      console.error("Member creation error:", memberError);
      setError("Erreur lors de la création du profil. Veuillez réessayer.");
      setIsLoading(false);
      return;
    }

    // Clear localStorage
    localStorage.removeItem("karosse_signup_firstname");

    // Redirect to calendar
    router.push("/calendar");
    router.refresh();
  }

  async function handleJoinGroup(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!userId) {
      setError("Session expirée. Veuillez vous reconnecter.");
      router.push("/login");
      return;
    }

    const supabase = createBrowserClient();

    // Find group by invite code
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("id, name")
      .eq("invite_code", inviteCode.toUpperCase().trim())
      .single();

    if (groupError || !group) {
      setError("Code d'invitation invalide. Vérifiez et réessayez.");
      setIsLoading(false);
      return;
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from("members")
      .select("id")
      .eq("user_id", userId)
      .eq("group_id", group.id)
      .single();

    if (existingMember) {
      localStorage.removeItem("karosse_signup_firstname");
      router.push("/calendar");
      router.refresh();
      return;
    }

    // Create member
    const { error: memberError } = await supabase.from("members").insert({
      user_id: userId,
      group_id: group.id,
      role: "member",
      display_name: firstName.trim(),
    });

    if (memberError) {
      console.error("Member creation error:", memberError);
      setError("Erreur lors de l'inscription au groupe. Veuillez réessayer.");
      setIsLoading(false);
      return;
    }

    // Clear localStorage
    localStorage.removeItem("karosse_signup_firstname");

    // Redirect to calendar
    router.push("/calendar");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-md mx-auto">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {["name", "choice", "final"].map((s, i) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                (step === "name" && i === 0) ||
                (step === "choice" && i <= 1) ||
                ((step === "create" || step === "join") && i <= 2)
                  ? "w-8 bg-primary"
                  : "w-2 bg-gray-300"
              }`}
            />
          ))}
        </div>

        {/* Step: Name */}
        {step === "name" && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-bold text-center text-gray-900 mb-2">
              Bienvenue !
            </h1>
            <p className="text-gray-600 text-center mb-6">
              Comment souhaitez-vous être appelé ?
            </p>

            <form onSubmit={handleNameSubmit} className="space-y-4">
              <div>
                <label htmlFor="firstName" className="label">
                  Votre prénom
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  placeholder="Jean"
                  className="input"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={!firstName.trim()}
                className="w-full py-3 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Continuer
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}

        {/* Step: Choice */}
        {step === "choice" && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h1 className="text-2xl font-display font-bold text-center text-gray-900 mb-2">
              Bonjour {firstName} !
            </h1>
            <p className="text-gray-600 text-center mb-6">
              Que souhaitez-vous faire ?
            </p>

            <div className="space-y-4">
              <button
                onClick={() => setStep("create")}
                className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-primary/5 transition-colors text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Créer un nouveau groupe
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Créez votre groupe de covoiturage et invitez d&apos;autres parents
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setStep("join")}
                className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-secondary hover:bg-secondary/5 transition-colors text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-secondary/20">
                    <UserPlus className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Rejoindre un groupe existant
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Entrez le code d&apos;invitation reçu d&apos;un autre parent
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step: Create Group */}
        {step === "create" && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <button
              onClick={() => setStep("choice")}
              className="text-gray-500 hover:text-gray-700 mb-4"
            >
              ← Retour
            </button>

            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-bold text-center text-gray-900 mb-6">
              Créer un groupe
            </h1>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm mb-4">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label htmlFor="groupName" className="label">
                  Nom du groupe
                </label>
                <input
                  id="groupName"
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                  placeholder="Ex: Parents 6ème A"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Établissement scolaire</label>
                <div className="space-y-2">
                  {SCHOOLS.map((school) => (
                    <label
                      key={school.id}
                      className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                        selectedSchool === school.id
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="school"
                        value={school.id}
                        checked={selectedSchool === school.id}
                        onChange={(e) => setSelectedSchool(e.target.value)}
                        className="sr-only"
                      />
                      <School
                        className={`w-5 h-5 ${
                          selectedSchool === school.id
                            ? "text-primary"
                            : "text-gray-400"
                        }`}
                      />
                      <span
                        className={
                          selectedSchool === school.id
                            ? "font-medium text-primary"
                            : "text-gray-700"
                        }
                      >
                        {school.name}
                      </span>
                      {selectedSchool === school.id && (
                        <CheckCircle className="w-5 h-5 text-primary ml-auto" />
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !groupName.trim() || !selectedSchool}
                className="w-full py-3 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    Créer le groupe
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Step: Join Group */}
        {step === "join" && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <button
              onClick={() => setStep("choice")}
              className="text-gray-500 hover:text-gray-700 mb-4"
            >
              ← Retour
            </button>

            <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-8 h-8 text-secondary" />
            </div>
            <h1 className="text-2xl font-display font-bold text-center text-gray-900 mb-6">
              Rejoindre un groupe
            </h1>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm mb-4">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleJoinGroup} className="space-y-4">
              <div>
                <label htmlFor="inviteCode" className="label">
                  Code d&apos;invitation
                </label>
                <input
                  id="inviteCode"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  required
                  placeholder="ABC123"
                  className="input text-center text-2xl tracking-widest font-mono uppercase"
                  maxLength={8}
                  autoFocus
                />
                <p className="text-sm text-gray-500 mt-2 text-center">
                  Demandez ce code à l&apos;organisateur du groupe
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading || inviteCode.length < 6}
                className="w-full py-3 px-4 bg-secondary text-white font-medium rounded-lg hover:bg-secondary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Vérification...
                  </>
                ) : (
                  <>
                    Rejoindre le groupe
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}

// Export with no SSR to prevent hydration issues
export default dynamic(() => Promise.resolve(OnboardingContent), {
  ssr: false,
  loading: () => (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </main>
  ),
});
