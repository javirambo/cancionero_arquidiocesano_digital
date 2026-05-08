"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // iOS Safari
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(ua);
}

export function InstallPwaButton() {
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [iosDevice, setIosDevice] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setIosDevice(isIOS());

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

  if (installed) return null;

  // Caso 1: hay prompt nativo disponible (Chrome/Android/desktop).
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
          className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-semibold uppercase tracking-wide text-primary-foreground transition-colors hover:opacity-90"
        >
          Instalar app
        </button>
      </section>
    );
  }

  // Caso 2: iOS Safari (no dispara beforeinstallprompt).
  if (iosDevice) {
    return (
      <section className="rounded-2xl border border-border bg-sidebar p-6">
        <h2 className="text-lg">Instalar app</h2>
        <p className="mt-2 text-sm normal-case text-muted-foreground">
          En iPhone / iPad podés instalar el cancionero como app desde Safari.
        </p>
        <button
          type="button"
          onClick={() => setShowIosHelp((v) => !v)}
          className="mt-4 rounded-full border border-border px-4 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          {showIosHelp ? "Ocultar instrucciones" : "Cómo instalar"}
        </button>
        {showIosHelp && (
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm normal-case text-muted-foreground">
            <li>Abrí esta página en Safari (no en otro navegador).</li>
            <li>
              Tocá el botón <strong>Compartir</strong> (cuadrado con flecha
              hacia arriba).
            </li>
            <li>
              Elegí <strong>Agregar a pantalla de inicio</strong>.
            </li>
            <li>
              Confirmá tocando <strong>Agregar</strong>.
            </li>
          </ol>
        )}
      </section>
    );
  }

  // Caso 3: navegador sin soporte (o ya instalada en otro perfil) → no mostrar nada.
  return null;
}
