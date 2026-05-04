"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useToast } from "./toast";

type WakeLockSentinel = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: "release", listener: () => void) => void;
};
type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> };
};

type Ctx = {
  active: boolean;
  supported: boolean | null;
  toggle: () => Promise<void>;
};

const WakeLockContext = createContext<Ctx | null>(null);

export function WakeLockProvider({ children }: { children: ReactNode }) {
  const { show } = useToast();
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

  const acquire = useCallback(async () => {
    const nav = navigator as WakeLockNavigator;
    if (!nav.wakeLock) return false;
    try {
      const s = await nav.wakeLock.request("screen");
      sentinelRef.current = s;
      s.addEventListener("release", () => {
        if (sentinelRef.current === s) sentinelRef.current = null;
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    const onVisibility = async () => {
      if (document.visibilityState === "visible" && !sentinelRef.current) {
        await acquire();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [active, acquire]);

  const toggle = useCallback(async () => {
    if (active) {
      await sentinelRef.current?.release().catch(() => undefined);
      sentinelRef.current = null;
      setActive(false);
      return;
    }
    const ok = await acquire();
    if (ok) {
      setActive(true);
      show("Se desactivó el apagado de pantalla");
    } else {
      show("No se pudo activar el modo coro", "error");
    }
  }, [active, acquire, show]);

  return (
    <WakeLockContext value={{ active, supported, toggle }}>
      {children}
    </WakeLockContext>
  );
}

export function useWakeLock(): Ctx {
  const ctx = useContext(WakeLockContext);
  if (!ctx) throw new Error("useWakeLock debe usarse dentro de WakeLockProvider");
  return ctx;
}
