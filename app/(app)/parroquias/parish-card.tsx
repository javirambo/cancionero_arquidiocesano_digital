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
  logo_url: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  status: ParishStatus;
  decanato: string | null;
  parent_id: string | null;
  parent: { name: string } | null;
};

export type AnimState = "entering" | "leaving";

type Props = {
  parish: Parish;
  isLogged: boolean;
  isMember: boolean;
  isPrimary: boolean;
  animState?: AnimState;
  canSeeMeta: boolean;
  showDescription: boolean;
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

// Foto/ícono de la parroquia arriba a la izquierda de la tarjeta, del mismo
// tamaño que el avatar de la página de detalle (h-16). Si no hay logo, cae a la
// inicial dentro de un círculo.
function ParishThumb({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  const showImg = logoUrl && !failed;

  if (showImg) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={logoUrl}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="h-16 w-16 shrink-0 rounded-full border border-border object-cover"
      />
    );
  }

  return (
    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-border bg-sidebar text-2xl text-primary">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export function ParishCard({
  parish,
  isLogged,
  isMember,
  isPrimary,
  animState,
  canSeeMeta,
  showDescription,
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
          className="flex min-w-0 flex-1 items-start gap-3"
        >
          <ParishThumb name={parish.name} logoUrl={parish.logo_url} />
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-lg text-song-title">{parish.name}</span>
            {(parish.address || parish.city) && (
              <span className="text-sm normal-case text-muted-foreground">
                {[parish.address, parish.city].filter(Boolean).join(", ")}
              </span>
            )}
            {canSeeMeta && (parish.decanato || (parish.parent_id && parish.parent?.name)) && (
              <span className="text-[10px] normal-case text-muted-foreground/70">
                {parish.decanato && <>Decanato: {parish.decanato}</>}
                {parish.decanato && parish.parent_id && parish.parent?.name && " · "}
                {parish.parent_id && parish.parent?.name && (
                  <>Sede: {parish.parent.name}</>
                )}
              </span>
            )}
          </span>
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

      {showDescription && parish.description && (
        <p className="text-sm normal-case text-muted-foreground">
          {parish.description}
        </p>
      )}
    </li>
  );
}
