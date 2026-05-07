"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

const DEFAULT_TITLE = "Cancionero";

type HomeTitleContextValue = {
  title: string;
  setTitle: (title: string) => void;
};

const HomeTitleContext = createContext<HomeTitleContextValue>({
  title: DEFAULT_TITLE,
  setTitle: () => {},
});

export function HomeTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitleState] = useState<string>(DEFAULT_TITLE);
  const setTitle = useCallback((next: string) => {
    setTitleState(next || DEFAULT_TITLE);
  }, []);
  return (
    <HomeTitleContext.Provider value={{ title, setTitle }}>
      {children}
    </HomeTitleContext.Provider>
  );
}

export function useHomeTitle() {
  return useContext(HomeTitleContext);
}
