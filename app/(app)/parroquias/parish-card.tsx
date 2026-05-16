"use client";

import Link from "next/link";
import { useState } from "react";

export type ParishStatus = "active" | "pending" | "inactive";

export type Parish = {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  city: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  status: ParishStatus;
};

export type AnimState = "entering" | "leaving";

type Props = {
  parish: Parish;
  isLogged: boolean;
  isMember: boolean;
  isPrimary: boolean;
  animState?: AnimState;
  onAdd: (parishId: string) => void | Promise<void>;
  onRemove: (parishId: string) => void | Promise<void>;
  onTogglePrimary: (parishId: string) => void | Promise<void>;
};

// Si está animando (entering o leaving), partimos de / quedamos en estado
// "colapsado": altura 0, sin padding, sin opacidad, borde transparente.
// La transición la hace el browser sobre estas propiedades.
const collapsedClass =
  "max-h-0 opacity-0 !p-0 !border-transparent overflow-hidden";
const expandedClass = "max-h-[600px] opacity-100";

export function ParishCard({
  parish,
  isLogged,
  isMember,
  isPrimary,
  animState,
  onAdd,
  onRemove,
  onTogglePrimary,
}: Props) {
  const [busy, setBusy] = useState(false);

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  // El estado visual: si animState está, el item está en su forma colapsada.
  // Sin animState, está en forma expandida (estado normal).
  const visualClass = animState ? collapsedClass : expandedClass;

  return (
    <li
      className={`flex h-full flex-col gap-2 rounded-xl border border-border bg-card p-5 transition-all duration-300 ease-in-out hover:border-primary ${visualClass}`}
    >
      <div className="flex items-start gap-2">
        <Link
          href={`/parroquias/${parish.slug}`}
          className="flex min-w-0 flex-1 flex-col gap-1"
        >
          <span className="text-lg text-song-title">{parish.name}</span>
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
                  withBusy(() => Promise.resolve(onTogglePrimary(parish.id)));
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
                withBusy(() =>
                  Promise.resolve(
                    isMember ? onRemove(parish.id) : onAdd(parish.id)
                  )
                );
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
    </li>
  );
}
