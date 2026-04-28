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

type Preferences = {
  // Mostrar el toggle de acordes y la transposición en la vista de canción.
  // Default: false (los acordes son para músicos, no para la asamblea).
  suggestChords: boolean;
};

const DEFAULTS: Preferences = {
  suggestChords: false,
};

const STORAGE_KEY = "preferences:v1";

type Ctx = Preferences & {
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
};

const PreferencesContext = createContext<Ctx | null>(null);

function load(): Preferences {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

function save(prefs: Preferences) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignorar
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);

  useEffect(() => {
    setPrefs(load());
  }, []);

  const setPreference = useCallback<Ctx["setPreference"]>((key, value) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      save(next);
      return next;
    });
  }, []);

  const value = useMemo<Ctx>(
    () => ({ ...prefs, setPreference }),
    [prefs, setPreference]
  );

  return <PreferencesContext value={value}>{children}</PreferencesContext>;
}

export function usePreferences(): Ctx {
  const ctx = useContext(PreferencesContext);
  if (!ctx)
    throw new Error("usePreferences debe usarse dentro de PreferencesProvider");
  return ctx;
}
