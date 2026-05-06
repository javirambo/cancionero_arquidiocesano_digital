"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Ctx = {
  user: User | null;
  loading: boolean;
};

const SessionContext = createContext<Ctx | null>(null);

// Provider único que llama a supabase.auth una sola vez. Los demás providers
// consumen useSession() en lugar de llamar getUser/getSession por su cuenta:
// llamadas concurrentes desde múltiples providers causan contención en el
// lock interno de gotrue-js (AbortError: Lock broken).
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<Ctx>(() => ({ user, loading }), [user, loading]);

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): Ctx {
  const ctx = useContext(SessionContext);
  if (!ctx)
    throw new Error("useSession debe usarse dentro de SessionProvider");
  return ctx;
}
