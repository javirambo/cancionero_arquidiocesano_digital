"use client";

import { useState } from "react";
import { useFavorites } from "./favorites";

export function MergeFavoritesDialog() {
  const { pendingConflict, resolveConflict } = useFavorites();
  const [busy, setBusy] = useState(false);

  if (!pendingConflict) return null;

  const localCount = pendingConflict.local.length;
  const remoteCount = pendingConflict.remote.length;

  async function pick(strategy: "combine" | "keep-server" | "replace-with-local") {
    if (busy) return;
    setBusy(true);
    try {
      await resolveConflict(strategy);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="merge-favorites-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-border bg-background p-6 shadow-xl">
        <h2 id="merge-favorites-title" className="text-xl">
          Tenés favoritos guardados
        </h2>
        <p className="text-sm normal-case text-foreground">
          Encontramos <strong>{localCount}</strong>{" "}
          {localCount === 1 ? "favorito guardado" : "favoritos guardados"} en
          este navegador y <strong>{remoteCount}</strong> en tu cuenta. ¿Qué
          querés hacer?
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => pick("combine")}
            disabled={busy}
            className="rounded-full border border-primary bg-primary px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white hover:opacity-90 disabled:opacity-60"
          >
            Combinar ambos
          </button>
          <button
            type="button"
            onClick={() => pick("keep-server")}
            disabled={busy}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold uppercase tracking-wide text-foreground hover:border-primary hover:text-primary disabled:opacity-50"
          >
            Mantener solo los de mi cuenta
          </button>
          <button
            type="button"
            onClick={() => pick("replace-with-local")}
            disabled={busy}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold uppercase tracking-wide text-foreground hover:border-primary hover:text-primary disabled:opacity-50"
          >
            Reemplazar con los del navegador
          </button>
        </div>
      </div>
    </div>
  );
}
