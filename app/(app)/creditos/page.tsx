import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { HeroContent } from "@/app/components/home-hero";

export const metadata: Metadata = {
  title: "Créditos · Cancionero Arquidiocesano",
  description:
    "Créditos del Cancionero Arquidiocesano y referencia al cantoral oficial.",
};

async function getPrimaryParishName(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("users")
    .select("parish_id")
    .eq("id", user.id)
    .maybeSingle();
  const primaryId = (profile?.parish_id as string | undefined) ?? null;
  if (!primaryId) return null;
  const { data: pr } = await supabase
    .from("parishes")
    .select("name")
    .eq("id", primaryId)
    .maybeSingle();
  return (pr?.name as string | undefined) ?? null;
}

export default async function CreditosPage() {
  const parishName = await getPrimaryParishName();
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-16">
      <HeroContent parishName={parishName} />
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-secondary">
          Información
        </p>
        <h1 className="text-3xl leading-tight">Créditos</h1>
      </header>

      <section className="flex flex-col gap-3 normal-case">
        <p className="text-base leading-7 text-foreground">
          Estos cantos han sido aprobados por la Comisión de Música Litúrgica
          de la ciudad de Rosario y tomados del cantoral oficial de la
          diócesis de Argentina y otros países.
        </p>
      </section>
    </main>
  );
}
