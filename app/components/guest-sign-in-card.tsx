"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserIcon } from "./icons";

const IngresarArrow = () => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
    <path d="M14 8l4 4-4 4" />
    <path d="M18 12H8" />
  </svg>
);

// Tarjeta destacada para invitados: resalta el mensaje y actúa como enlace
// para iniciar sesión con Google (mismo flujo OAuth que GoogleSignInButton).
export function GuestSignInCard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleSignIn}
        disabled={loading}
        className="flex w-full items-center gap-4 rounded-2xl border border-primary bg-sidebar p-4 text-left shadow-sm transition-shadow hover:shadow-md disabled:opacity-60"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground [&_svg]:h-6 [&_svg]:w-6">
          <UserIcon />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 normal-case">
          <span className="text-base font-semibold text-page-title">
            Estás navegando como invitado
          </span>
          <span className="text-sm text-muted-foreground">
            Iniciá sesión para guardar tus favoritos en la nube, vincular tu
            parroquia y acceder a tus listas.
          </span>
          <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary">
            {loading ? "Redirigiendo…" : "Iniciar sesión"}
            <IngresarArrow />
          </span>
        </span>
      </button>
      {error && <p className="text-xs normal-case text-destructive">{error}</p>}
    </div>
  );
}
