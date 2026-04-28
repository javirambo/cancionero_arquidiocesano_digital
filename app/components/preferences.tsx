"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Preferences = {
  // Mostrar el toggle de acordes y la transposición en la vista de canción.
  // Default: false (los acordes son para músicos, no para la asamblea).
  suggestChords: boolean;
};

const DEFAULTS: Preferences = {
  suggestChords: false,
};

type Ctx = Preferences & {
  setPreference: <K extends keyof Preferences>(
    key: K,
    value: Preferences[K]
  ) => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
};

const PreferencesContext = createContext<Ctx | null>(null);

async function loadFromDb(userId: string): Promise<Preferences> {
  const supabase = createClient();
  const { data } = await supabase
    .from("users")
    .select("preferences")
    .eq("id", userId)
    .maybeSingle();
  const raw = (data?.preferences ?? {}) as Partial<Preferences>;
  return { ...DEFAULTS, ...raw };
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (!data.user) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setPrefs(DEFAULTS);
        setLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    loadFromDb(user.id).then((p) => {
      setPrefs(p);
      setLoading(false);
    });
  }, [user]);

  const setPreference = useCallback<Ctx["setPreference"]>(
    async (key, value) => {
      if (!user) return;
      const next = { ...prefs, [key]: value };
      setPrefs(next);
      const supabase = createClient();
      await supabase
        .from("users")
        .update({ preferences: next })
        .eq("id", user.id);
    },
    [prefs, user]
  );

  const value = useMemo<Ctx>(
    () => ({
      ...prefs,
      setPreference,
      isAuthenticated: Boolean(user),
      loading,
    }),
    [prefs, setPreference, user, loading]
  );

  return <PreferencesContext value={value}>{children}</PreferencesContext>;
}

export function usePreferences(): Ctx {
  const ctx = useContext(PreferencesContext);
  if (!ctx)
    throw new Error("usePreferences debe usarse dentro de PreferencesProvider");
  return ctx;
}
