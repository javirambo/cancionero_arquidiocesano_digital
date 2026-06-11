"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

const DEFAULT_TITLE = "Cancionero";

// Branding de parroquia para el header superior: cuando está seteado,
// el SiteHeader muestra la foto redonda y el nombre de la parroquia en
// lugar de los logos institucionales (cordero + liturgia).
export type HeaderBrand = {
  name: string;
  logoUrl: string | null;
  href: string;
};

type HomeTitleContextValue = {
  title: string;
  setTitle: (title: string) => void;
  brand: HeaderBrand | null;
  setBrand: (brand: HeaderBrand | null) => void;
};

const HomeTitleContext = createContext<HomeTitleContextValue>({
  title: DEFAULT_TITLE,
  setTitle: () => {},
  brand: null,
  setBrand: () => {},
});

export function HomeTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitleState] = useState<string>(DEFAULT_TITLE);
  const [brand, setBrandState] = useState<HeaderBrand | null>(null);
  const setTitle = useCallback((next: string) => {
    setTitleState(next || DEFAULT_TITLE);
  }, []);
  const setBrand = useCallback((next: HeaderBrand | null) => {
    setBrandState(next);
  }, []);
  return (
    <HomeTitleContext.Provider value={{ title, setTitle, brand, setBrand }}>
      {children}
    </HomeTitleContext.Provider>
  );
}

export function useHomeTitle() {
  return useContext(HomeTitleContext);
}
