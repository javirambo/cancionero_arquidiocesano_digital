import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewParishForm } from "./new-parish-form";

export const metadata = {
  title: "Sugerir parroquia · Cancionero Arquidiocesano",
};

export default async function NuevaParroquiaUserPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/perfil");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-8">
      <Link
        href="/parroquias"
        className="flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-secondary hover:underline"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Parroquias
      </Link>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl">Sugerir una parroquia</h1>
        <p className="text-sm normal-case text-muted-foreground">
          Buscala en el mapa o cargá los datos manualmente. Quedará pendiente
          hasta que un administrador la apruebe.
        </p>
      </header>
      <NewParishForm />
    </main>
  );
}
