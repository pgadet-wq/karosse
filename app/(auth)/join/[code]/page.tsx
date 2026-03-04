import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { JoinGroupClient } from "./client";

interface JoinPageProps {
  params: { code: string };
}

export default async function JoinPage({ params }: JoinPageProps) {
  const supabase = createServerClient();
  const code = params.code.toUpperCase();

  // Fetch group info
  const { data: group } = await supabase
    .from("groups")
    .select("id, name, school_name")
    .eq("invite_code", code)
    .single();

  if (!group) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">😕</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Lien invalide
          </h1>
          <p className="text-gray-600 mb-6">
            Ce code d&apos;invitation n&apos;existe pas ou a expiré.
          </p>
          <a
            href="/login"
            className="inline-block py-2 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            Retour à l&apos;accueil
          </a>
        </div>
      </main>
    );
  }

  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Check if already a member
    const { data: existingMember } = await supabase
      .from("members")
      .select("id")
      .eq("user_id", user.id)
      .eq("group_id", group.id)
      .single();

    if (existingMember) {
      // Already a member, redirect to calendar
      redirect("/calendar");
    }

    // Get user's display name
    const firstName = user.user_metadata?.first_name || user.email?.split("@")[0] || "Membre";

    // Join the group
    await supabase.from("members").insert({
      user_id: user.id,
      group_id: group.id,
      role: "member",
      display_name: firstName,
    });

    redirect("/calendar");
  }

  // User not logged in, show the join page
  return <JoinGroupClient group={group} code={code} />;
}
