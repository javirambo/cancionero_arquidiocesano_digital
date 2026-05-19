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
  // Al recargar requiere un gesto del usuario para reactivarse
  // (limitación de la Web API).
  keepScreenOn: boolean;
  // Mostrar acordes en la vista de canción. Default false: la primera vez
  // que un usuario entra (aunque tenga parroquia) los acordes están ocultos.
  showChords: boolean;
  // Tema visual.
  theme: "light" | "dark";
  // Velocidad del desplazamiento automático en la vista de canción (1..7).
  scrollSpeed: number;
};

const DEFAULTS: Preferences = {
  keepScreenOn: false,
  showChords: false,
  theme: "light",
  scrollSpeed: 4,
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

// Claves de localStorage para invitados (y como fallback antes de cargar BD).
// "theme" se mantiene con su nombre legacy porque el script inline anti-flash
// en theme.tsx lee esa misma key antes del primer paint.
const LS_KEYS: Record<keyof Preferences, string> = {
  keepScreenOn: "prefs:keepScreenOn",
  showChords: "prefs:showChords",
  theme: "theme",
  scrollSpeed: "prefs:scrollSpeed",
};

function readLocalPrefs(): Preferences {
  if (typeof window === "undefined") return DEFAULTS;
  const out: Preferences = { ...DEFAULTS };
  try {
    const sc = window.localStorage.getItem(LS_KEYS.showChords);
    if (sc !== null) out.showChords = sc === "true";
    const ks = window.localStorage.getItem(LS_KEYS.keepScreenOn);
    if (ks !== null) out.keepScreenOn = ks === "true";
    const th = window.localStorage.getItem(LS_KEYS.theme);
    if (th === "dark" || th === "light") out.theme = th;
    const ss = window.localStorage.getItem(LS_KEYS.scrollSpeed);
    if (ss !== null) {
      const n = Number.parseInt(ss, 10);
      if (Number.isFinite(n) && n >= 1 && n <= 7) out.scrollSpeed = n;
    }
  } catch {
    // ignorar (modo privado, etc.)
  }
  return out;
}

function writeLocalPref<K extends keyof Preferences>(
  key: K,
  value: Preferences[K]
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEYS[key], String(value));
  } catch {
    // ignorar
  }
}

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
  const { user } = useSession();
  // Hidratamos siempre con localStorage primero para evitar flash:
  // el invitado mantiene sus prefs; el member las usa como fallback hasta
  // que termine la lectura de BD.
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const local = readLocalPrefs();
    if (!user) {
      setPrefs(local);
      setLoading(false);
      return;
    }
    setPrefs(local);
    setLoading(true);
    loadFromDb(user.id).then((p) => {
      setPrefs(p);
      // Reflejamos en localStorage para mantener consistencia local
      // (el script anti-flash del theme depende de esto).
      (Object.keys(p) as Array<keyof Preferences>).forEach((k) =>
        writeLocalPref(k, p[k])
      );
      setLoading(false);
    });
  }, [user]);

  const setPreference = useCallback<Ctx["setPreference"]>(
    async (key, value) => {
      const next = { ...prefs, [key]: value };
      setPrefs(next);
      writeLocalPref(key, value);
      if (!user) return;
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
