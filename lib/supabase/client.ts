import { createBrowserClient } from "@supabase/ssr";

// Singleton del cliente del browser. Crear múltiples instancias provoca
// contención del lock interno de gotrue-js (varios "gotrue" compitiendo
// por el mismo lock con nombre fijo en localStorage), que termina en
// "AbortError: Lock broken" y estado de auth corrupto.
function build() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

let cached: ReturnType<typeof build> | null = null;

export function createClient(): ReturnType<typeof build> {
  if (!cached) cached = build();
  return cached;
}
