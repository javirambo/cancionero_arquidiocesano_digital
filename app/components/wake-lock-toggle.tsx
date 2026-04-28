"use client";

import { useEffect, useRef, useState } from "react";

// Mínimo necesario de la Wake Lock API. No está aún en lib.dom de TS.
type WakeLockSentinel = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: "release", listener: () => void) => void;
};
type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> };
};

export function WakeLockToggle() {
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    setSupported(
      typeof navigator !== "undefined" &&
        "wakeLock" in (navigator as WakeLockNavigator)
    );
  }, []);

  useEffect(() => {
    return () => {
      sentinelRef.current?.release().catch(() => undefined);
      sentinelRef.current = null;
    };
  }, []);

  // Si volvemos a la pestaña con el modo activo, re-pedimos el lock
  // (los browsers lo liberan al perder visibilidad).
  useEffect(() => {
    if (!active) return;
    const onVisibility = async () => {
      if (document.visibilityState === "visible" && !sentinelRef.current) {
        await acquire();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  async function acquire() {
    const nav = navigator as WakeLockNavigator;
    if (!nav.wakeLock) return;
    try {
      const s = await nav.wakeLock.request("screen");
      sentinelRef.current = s;
      s.addEventListener("release", () => {
        if (sentinelRef.current === s) sentinelRef.current = null;
      });
    } catch {
      // Permiso denegado o batería baja: el usuario verá el toggle apagarse.
      setActive(false);
    }
  }

  async function toggle() {
    if (active) {
      await sentinelRef.current?.release().catch(() => undefined);
      sentinelRef.current = null;
      setActive(false);
      return;
    }
    setActive(true);
    await acquire();
  }

  if (supported === false) {
    return (
      <span
        className="rounded-full border border-border px-3 py-1 text-xs normal-case text-muted-foreground"
        title="Tu navegador no soporta mantener la pantalla activa. Ajustá la configuración de pantalla manualmente."
      >
        Modo coro no disponible
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={active}
      className="rounded-full border border-primary px-4 py-1.5 text-sm uppercase tracking-wide text-primary transition-colors hover:bg-primary hover:text-white"
      title="Mantiene la pantalla encendida durante la celebración"
    >
      {active ? "Modo coro activo" : "Modo coro"}
    </button>
  );
}
