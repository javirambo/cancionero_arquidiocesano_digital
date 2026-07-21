"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// Clave de localStorage donde se persiste el brand elegido a mano en el
// selector del header. El brand NO se deriva de la página actual: solo cambia
// cuando el usuario elige un ítem en el ParishSwitcher (Arquidiócesis o una
// parroquia). Persistirlo mantiene la selección al navegar y al recargar.
const BRAND_STORAGE_KEY = "header-brand";

// Branding de parroquia para el header superior: cuando está seteado,
// el SiteHeader muestra la foto redonda y el nombre de la parroquia en
// lugar de los logos institucionales (cordero + liturgia).
export type HeaderBrand = {
  name: string;
  logoUrl: string | null;
  href: string;
};

type HomeTitleContextValue = {
  brand: HeaderBrand | null;
  setBrand: (brand: HeaderBrand | null) => void;
};

const HomeTitleContext = createContext<HomeTitleContextValue>({
  brand: null,
  setBrand: () => {},
});

export function HomeTitleProvider({ children }: { children: ReactNode }) {
  const [brand, setBrandState] = useState<HeaderBrand | null>(null);

  // Hidrata el brand persistido al montar (una vez). Arranca en null para no
  // romper la hidratación SSR; si hay uno guardado, se aplica en el cliente.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(BRAND_STORAGE_KEY);
      // Hidratación client-only desde localStorage: el setState en el effect es
      // intencional (SSR y primer render cliente arrancan en null, sin mismatch).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setBrandState(JSON.parse(raw) as HeaderBrand);
    } catch {
      // ignore
    }
  }, []);

  const setBrand = useCallback((next: HeaderBrand | null) => {
    setBrandState(next);
    try {
      if (next) localStorage.setItem(BRAND_STORAGE_KEY, JSON.stringify(next));
      else localStorage.removeItem(BRAND_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);
  return (
    <HomeTitleContext.Provider value={{ brand, setBrand }}>
      {children}
    </HomeTitleContext.Provider>
  );
}

export function useHomeTitle() {
  return useContext(HomeTitleContext);
}
