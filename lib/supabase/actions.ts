"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "./server";

export async function signIn(formData: FormData) {
  const supabase = createServerClient();

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    return { error: error.message };
  }

  const redirectTo = formData.get("redirect") as string;
  revalidatePath("/", "layout");
  redirect(redirectTo || "/calendar");
}

export async function signUp(formData: FormData) {
  const supabase = createServerClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const nom = formData.get("nom") as string;
  const prenom = formData.get("prenom") as string;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nom,
        prenom,
        full_name: `${prenom} ${nom}`,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/connexion?message=Vérifiez votre email pour confirmer votre compte");
}

export async function signOut() {
  const supabase = createServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/connexion");
}

export async function resetPassword(formData: FormData) {
  const supabase = createServerClient();

  const email = formData.get("email") as string;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/connexion?message=Vérifiez votre email pour réinitialiser votre mot de passe");
}
