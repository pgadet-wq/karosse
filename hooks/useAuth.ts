"use client";

// TODO: Implement auth hook with Supabase
// import { useEffect, useState } from "react";
// import { User } from "@supabase/supabase-js";
// import { createClient } from "@/lib/supabase/client";

export function useAuth() {
  // const [user, setUser] = useState<User | null>(null);
  // const [loading, setLoading] = useState(true);

  // useEffect(() => {
  //   const supabase = createClient();
  //   // ... auth state listener
  // }, []);

  return {
    user: null,
    loading: false,
    signIn: async () => {},
    signOut: async () => {},
    signUp: async () => {},
  };
}
