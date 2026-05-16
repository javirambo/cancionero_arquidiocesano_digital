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
import { createClient } from "@/lib/supabase/client";
import { useSession } from "./session";

type Preferences = {
  // Mantener la pantalla encendida (Screen Wake Lock).
  // Sólo aplica a usuarios autenticados; al recargar requiere un gesto del
  // usuario para reactivarse (limitación de la Web API).
  keepScreenOn: boolean;
  // Mostrar acordes en la vista de canción. Default false: la primera vez
  // que un usuario entra (aunque tenga parroquia) los acordes están ocultos.
  showChords: boolean;
};

const DEFAULTS: Preferences = {
  keepScreenOn: false,
  showChords: false,
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

// El invitado persiste `showChords` en localStorage (CU-02.2/CU-03).
// `keepScreenOn` queda solo para autenticados.
const GUEST_SHOW_CHORDS_KEY = "prefs:showChords";

function loadGuestPrefs(): Preferences {
  if (typeof window === "undefined") return DEFAULTS;
  const raw = window.localStorage.getItem(GUEST_SHOW_CHORDS_KEY);
  if (raw === null) return DEFAULTS;
  return { ...DEFAULTS, showChords: raw === "true" };
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPrefs(loadGuestPrefs());
      setLoading(false);
      return;
    }
    setLoading(true);
    loadFromDb(user.id).then((p) => {
      setPrefs(p);
      setLoading(false);
    });
  }, [user]);

  const setPreference = useCallback<Ctx["setPreference"]>(
    async (key, value) => {
      const next = { ...prefs, [key]: value };
      setPrefs(next);
      if (!user) {
        if (key === "showChords" && typeof window !== "undefined") {
          window.localStorage.setItem(GUEST_SHOW_CHORDS_KEY, String(value));
        }
        return;
      }
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
