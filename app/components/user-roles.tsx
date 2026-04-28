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

export type RoleName = "admin" | "editor" | "coordinator" | "member";

type Ctx = {
  roles: RoleName[];
  isAdmin: boolean;
  isEditor: boolean;
  isCoordinator: boolean;
  loading: boolean;
};

const UserRolesContext = createContext<Ctx | null>(null);

async function loadRoles(userId: string): Promise<RoleName[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", userId);
  if (!data) return [];
  return data
    .map((row) => {
      const rel = row.roles as { name: string } | { name: string }[] | null;
      const single = Array.isArray(rel) ? rel[0] : rel;
      return single?.name as RoleName | undefined;
    })
    .filter((n): n is RoleName => Boolean(n));
}

export function UserRolesProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<RoleName[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (!data.user) {
        setRoles([]);
        setLoading(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setRoles([]);
        setLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    loadRoles(user.id).then((r) => {
      setRoles(r);
      setLoading(false);
    });
  }, [user]);

  const value = useMemo<Ctx>(
    () => ({
      roles,
      isAdmin: roles.includes("admin"),
      isEditor: roles.includes("editor") || roles.includes("admin"),
      isCoordinator:
        roles.includes("coordinator") ||
        roles.includes("editor") ||
        roles.includes("admin"),
      loading,
    }),
    [roles, loading]
  );

  return <UserRolesContext value={value}>{children}</UserRolesContext>;
}

export function useUserRoles(): Ctx {
  const ctx = useContext(UserRolesContext);
  if (!ctx)
    throw new Error("useUserRoles debe usarse dentro de UserRolesProvider");
  return ctx;
}
