"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/lib/supabase/actions";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut()}
      className="flex items-center gap-2 w-full px-4 py-3 text-left text-danger hover:bg-danger/5 rounded-lg transition-colors"
    >
      <LogOut className="w-5 h-5" />
      <span>Déconnexion</span>
    </button>
  );
}
