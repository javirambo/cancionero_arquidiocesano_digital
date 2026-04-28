"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Parish = {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  city: string | null;
  description: string | null;
};

type Props = {
  parish: Parish;
  isLogged: boolean;
  isMember: boolean;
  isPrimary: boolean;
};

export function ParishCard({ parish, isLogged, isMember, isPrimary }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function withSession<T>(
    fn: (userId: string) => Promise<T>
  ): Promise<T | undefined> {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setError("Sesión expirada.");
      return;
    }
    return fn(data.user.id);
  }

  async function handleAssociate() {
    setBusy(true);
    setError(null);
    await withSession(async (userId) => {
      const supabase = createClient();
      const { error: e } = await supabase
        .from("parish_members")
        .insert({ user_id: userId, parish_id: parish.id, role: "member" });
      if (e) {
        setError(e.message);
      } else {
        router.refresh();
      }
    });
    setBusy(false);
  }

  async function handleDisassociate() {
    const ok = window.confirm(`¿Quitar "${parish.name}" de tus parroquias?`);
    if (!ok) return;
    setBusy(true);
    setError(null);
    await withSession(async (userId) => {
      const supabase = createClient();
      // Si era la principal, primero limpiar users.parish_id.
      if (isPrimary) {
        await supabase.from("users").update({ parish_id: null }).eq("id", userId);
      }
      const { error: e } = await supabase
        .from("parish_members")
        .delete()
        .eq("user_id", userId)
        .eq("parish_id", parish.id);
      if (e) {
        setError(e.message);
      } else {
        router.refresh();
      }
    });
    setBusy(false);
  }

  async function handleTogglePrimary() {
    setBusy(true);
    setError(null);
    await withSession(async (userId) => {
      const supabase = createClient();
      const { error: e } = await supabase
        .from("users")
        .update({ parish_id: isPrimary ? null : parish.id })
        .eq("id", userId);
      if (e) {
        setError(e.message);
      } else {
        router.refresh();
      }
    });
    setBusy(false);
  }

  return (
    <li className="flex h-full flex-col gap-2 rounded-xl border border-border bg-background p-5 transition-colors hover:border-primary">
      <div className="flex items-start gap-2">
        <Link
          href={`/parroquias/${parish.slug}`}
          className="flex min-w-0 flex-1 flex-col gap-1"
        >
          <span className="text-lg text-primary">{parish.name}</span>
          {(parish.address || parish.city) && (
            <span className="text-xs normal-case text-muted-foreground">
              {[parish.address, parish.city].filter(Boolean).join(" · ")}
            </span>
          )}
        </Link>

        {isLogged && (
          <div className="relative z-10 flex shrink-0 items-center gap-1">
            {isMember && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleTogglePrimary();
                }}
                disabled={busy}
                title={
                  isPrimary
                    ? "Quitar como parroquia principal"
                    : "Marcar como parroquia principal"
                }
                aria-label={
                  isPrimary
                    ? "Quitar como parroquia principal"
                    : "Marcar como parroquia principal"
                }
                className="flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-base text-muted-foreground transition-colors hover:border-border hover:text-primary disabled:opacity-50"
              >
                {isPrimary ? "⭐" : "☆"}
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isMember) handleDisassociate();
                else handleAssociate();
              }}
              disabled={busy}
              title={
                isMember
                  ? `Quitar ${parish.name} de tus parroquias`
                  : `Asociarme a ${parish.name}`
              }
              aria-label={
                isMember
                  ? `Quitar ${parish.name} de tus parroquias`
                  : `Asociarme a ${parish.name}`
              }
              className={`flex h-8 w-8 items-center justify-center rounded-full border text-lg font-semibold transition-colors disabled:opacity-50 ${
                isMember
                  ? "border-border text-muted-foreground hover:border-destructive hover:text-destructive"
                  : "border-border text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {isMember ? "−" : "+"}
            </button>
          </div>
        )}
      </div>

      {parish.description && (
        <p className="text-sm normal-case text-muted-foreground">
          {parish.description}
        </p>
      )}

      {error && (
        <p className="text-xs normal-case text-destructive">{error}</p>
      )}
    </li>
  );
}
