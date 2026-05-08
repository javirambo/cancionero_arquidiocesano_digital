"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Platform = "ios" | "android" | "desktop";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "desktop";
  const ua = window.navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

export function InstallPwaButton() {
  const [mounted, setMounted] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [platform, setPlatform] = useState<Platform>("desktop");

  useEffect(() => {
    setMounted(true);
    setInstalled(isStandalone());
    setPlatform(detectPlatform());

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!mounted || installed) return null;

  const primaryClass =
    "rounded-full bg-primary px-4 py-2 text-sm font-semibold uppercase tracking-wide text-primary-foreground transition-colors hover:opacity-90";
  const secondaryClass =
    "rounded-full border border-border px-4 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:border-primary hover:text-primary";

  // Caso 1: hay prompt nativo disponible (Chrome/Android/desktop reciente).
  if (deferredPrompt) {
    return (
      <section className="rounded-2xl border border-border bg-sidebar p-6">
        <h2 className="text-lg">Instalar app</h2>
        <p className="mt-2 text-sm normal-case text-muted-foreground">
          Instalá el cancionero como app en tu dispositivo para acceder más
          rápido y usarlo sin conexión.
        </p>
        <button
          type="button"
          onClick={async () => {
            await deferredPrompt.prompt();
            const choice = await deferredPrompt.userChoice;
            if (choice.outcome === "accepted") {
              setInstalled(true);
            }
            setDeferredPrompt(null);
          }}
          className={`mt-4 ${primaryClass}`}
        >
          Instalar app
        </button>
      </section>
    );
  }

  // Caso 2: no llegó el evento (o ya se consumió). Mostramos instrucciones según plataforma.
  const helpContent = (() => {
    if (platform === "ios") {
      return (
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm normal-case text-muted-foreground">
          <li>Abrí esta página en Safari (no en otro navegador).</li>
          <li>
            Tocá el botón <strong>Compartir</strong> (cuadrado con flecha hacia
            arriba).
          </li>
          <li>
            Elegí <strong>Agregar a pantalla de inicio</strong>.
          </li>
          <li>
            Confirmá tocando <strong>Agregar</strong>.
          </li>
        </ol>
      );
    }
    if (platform === "android") {
      return (
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm normal-case text-muted-foreground">
          <li>Tocá el menú de tres puntos arriba a la derecha de Chrome.</li>
          <li>
            Elegí <strong>Instalar app</strong> o{" "}
            <strong>Agregar a la pantalla de inicio</strong>.
          </li>
          <li>
            Confirmá tocando <strong>Instalar</strong>.
          </li>
        </ol>
      );
    }
    return (
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm normal-case text-muted-foreground">
        <li>
          Buscá el ícono de instalación en la barra de direcciones (a la
          derecha de la URL, suele ser un cuadrado con una flecha).
        </li>
        <li>
          O abrí el menú de Chrome / Edge y elegí{" "}
          <strong>Instalar Cancionero…</strong>.
        </li>
        <li>
          Confirmá tocando <strong>Instalar</strong>.
        </li>
      </ol>
    );
  })();

  return (
    <section className="rounded-2xl border border-border bg-sidebar p-6">
      <h2 className="text-lg">Instalar app</h2>
      <p className="mt-2 text-sm normal-case text-muted-foreground">
        Instalá el cancionero como app en tu dispositivo para acceder más
        rápido y usarlo sin conexión.
      </p>
      <button
        type="button"
        onClick={() => setShowHelp((v) => !v)}
        className={`mt-4 ${secondaryClass}`}
      >
        {showHelp ? "Ocultar instrucciones" : "Cómo instalar"}
      </button>
      {showHelp && helpContent}
    </section>
  );
}
