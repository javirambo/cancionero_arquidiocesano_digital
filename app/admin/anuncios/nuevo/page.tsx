import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AnuncioForm } from "../anuncio-form";

export default async function NuevoAnuncioPage() {
  const supabase = await createClient();
  const { data: parishes } = await supabase
    .from("parishes")
    .select("id, slug, name")
    .eq("is_active", true)
    .order("name");

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link
          href="/admin/anuncios"
          className="text-xs uppercase tracking-[0.2em] text-secondary hover:text-primary"
        >
          ← Volver
        </Link>
        <h1 className="text-2xl">Nuevo anuncio</h1>
      </header>

      <AnuncioForm mode="create" parishes={parishes ?? []} />
    </main>
  );
}
