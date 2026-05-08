"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function GoogleSignInButton() {
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
        // Forzar selector de cuentas (no auto-loguear con la sesión activa).
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      <button
        type="button"
        onClick={handleSignIn}
        disabled={loading}
        className="rounded-full border border-primary px-5 py-2 text-sm font-semibold uppercase tracking-wide text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
      >
        {loading ? "Redirigiendo…" : "Ingresar con Google"}
      </button>
      {error && (
        <p className="text-xs normal-case text-destructive">{error}</p>
      )}
    </div>
  );
}
