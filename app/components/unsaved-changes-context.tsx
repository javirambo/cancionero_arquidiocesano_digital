"use client";

// Flag global "hay cambios sin guardar". Los editores (lecturas, salmos) lo
// setean mientras están sucios; la barra inferior (BottomNav) lo lee para
// confirmar antes de navegar y no perder la edición.

import { createContext, useContext, useState, type ReactNode } from "react";

type UnsavedChangesCtx = {
  dirty: boolean;
  setDirty: (value: boolean) => void;
};

const Ctx = createContext<UnsavedChangesCtx | null>(null);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [dirty, setDirty] = useState(false);
  return <Ctx.Provider value={{ dirty, setDirty }}>{children}</Ctx.Provider>;
}

export function useUnsavedChanges(): UnsavedChangesCtx {
  return useContext(Ctx) ?? { dirty: false, setDirty: () => {} };
}
