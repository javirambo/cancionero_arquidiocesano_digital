"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  type ReactNode,
} from "react";
import { usePreferences } from "./preferences";

export type Theme = "light" | "dark";

// Key legacy: el script inline anti-flash la lee antes del primer paint.
// PreferencesProvider también la mantiene en sync.
const STORAGE_KEY = "theme";

type ThemeContextValue = {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(t: Theme) {
  const root = document.documentElement;
  if (t === "dark") root.setAttribute("data-theme", "dark");
  else root.removeAttribute("data-theme");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme, setPreference } = usePreferences();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback(
    (t: Theme) => {
      void setPreference("theme", t);
    },
    [setPreference]
  );

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return (
    <ThemeContext value={{ theme, toggle, setTheme }}>{children}</ThemeContext>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de ThemeProvider");
  return ctx;
}

// Script inline para aplicar el tema persistido antes del primer paint y
// evitar el flash. Default: light (no se respeta prefers-color-scheme).
export const themeInitScript = `
(function () {
  try {
    var t = localStorage.getItem('${STORAGE_KEY}');
    if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  } catch (e) {}
})();
`;
