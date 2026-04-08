"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    const supabase = createClient();

    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setState({ user, loading: false });
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, loading: false });
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const displayName = state.user?.user_metadata?.full_name
    ?? state.user?.user_metadata?.name
    ?? state.user?.email?.split("@")[0]
    ?? "User";

  const initials = displayName.charAt(0).toUpperCase();

  const avatarUrl = state.user?.user_metadata?.avatar_url ?? null;

  return {
    user: state.user,
    loading: state.loading,
    displayName,
    initials,
    avatarUrl,
    email: state.user?.email ?? "",
    signOut,
  };
}
