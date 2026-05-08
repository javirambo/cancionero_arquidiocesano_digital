"use client";

import { useEffect, useState } from "react";

type Status = "idle" | "loading" | "done" | "error" | "partial";

type Props = {
  /** Slugs de canciones a precachear. */
  slugs: string[];
  /** Clave estable para recordar el estado entre visitas (ej: `playlist:<id>` o `favoritos`). */
  storageKey: string;
  /** Texto del botón cuando no se descargó nada todavía. */
  label?: string;
};

const PREFIX = "pwa-precache:";

export function PrecacheButton({
  slugs,
  storageKey,
  label = "Descargar para usar sin conexión",
}: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [swReady, setSwReady] = useState(false);
  const [persistedAt, setPersistedAt] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.getRegistration().then((reg) => {
      setSwReady(Boolean(reg?.active));
    });
    const stored = localStorage.getItem(PREFIX + storageKey);
    if (stored) setPersistedAt(stored);
  }, [storageKey]);

  if (!swReady) return null;
  if (slugs.length === 0) return null;

  async function handleDownload() {
    setStatus("loading");
    setProgress({ done: 0, total: slugs.length });

    let okCount = 0;
    for (const slug of slugs) {
      try {
        // cache: no-store fuerza ir a la red (vía SW) y refrescar la entrada cacheada.
        const res = await fetch(`/canciones/${slug}`, {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (res.ok) okCount++;
      } catch {
        // seguimos con la siguiente
      }
      setProgress((p) => ({ done: p.done + 1, total: p.total }));
    }

    if (okCount === slugs.length) {
      const ts = new Date().toISOString();
      localStorage.setItem(PREFIX + storageKey, ts);
      setPersistedAt(ts);
      setStatus("done");
    } else if (okCount > 0) {
      setStatus("partial");
    } else {
      setStatus("error");
    }
  }

  const buttonClass =
    "rounded-full border border-border px-4 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-60";

  if (status === "loading") {
    return (
      <button type="button" disabled className={buttonClass}>
        Descargando {progress.done} / {progress.total}…
      </button>
    );
  }

  if (status === "done" || (status === "idle" && persistedAt)) {
    return (
      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          onClick={handleDownload}
          className={buttonClass}
        >
          ✓ Disponible offline · Actualizar
        </button>
        {persistedAt && (
          <p className="text-xs normal-case text-muted-foreground">
            Última descarga: {new Date(persistedAt).toLocaleString("es-AR")}
          </p>
        )}
      </div>
    );
  }

  if (status === "partial") {
    return (
      <button type="button" onClick={handleDownload} className={buttonClass}>
        Descarga parcial · Reintentar
      </button>
    );
  }

  if (status === "error") {
    return (
      <button type="button" onClick={handleDownload} className={buttonClass}>
        Error al descargar · Reintentar
      </button>
    );
  }

  return (
    <button type="button" onClick={handleDownload} className={buttonClass}>
      {label}
    </button>
  );
}
