import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { HeroContent } from "@/app/components/home-hero";
import { CopyEmailButton } from "./copy-email-button";

const CONTACT_EMAIL = "contacto@ejemplo.com";

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

async function getFeedbackCardBgUrl(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "creditos_card_bg_url")
    .maybeSingle();
  const value = data?.value as { url?: string } | string | null | undefined;
  if (!value) return null;
  if (typeof value === "string") return value || null;
  return value.url ?? null;
}

export default async function CreditosPage() {
  const [parishName, feedbackBgUrl] = await Promise.all([
    getPrimaryParishName(),
    getFeedbackCardBgUrl(),
  ]);
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
        <p className="text-base leading-7 text-foreground">
          Esta aplicación ha sido desarrollada con el objetivo de ofrecer la
          mejor experiencia a nuestros usuarios. Agradecemos a todas las
          personas y herramientas que hicieron posible este proyecto.
        </p>
      </section>

      <section
        className="relative overflow-hidden rounded-xl border border-border bg-sidebar p-6 normal-case"
        style={
          feedbackBgUrl
            ? {
                backgroundImage: `url(${feedbackBgUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        {feedbackBgUrl && (
          <div
            aria-hidden
            className="absolute inset-0 bg-sidebar/75"
          />
        )}
        <div className="relative flex flex-col gap-3">
          <h2 className="text-2xl leading-tight">¿Tenés ideas para mejorar?</h2>
          <p className="text-base leading-7 text-foreground">
            Tu opinión es fundamental para nosotros. Si encontrás algún error,
            tenés una sugerencia o simplemente querés ayudarnos a crecer, no
            dudes en escribirnos.
          </p>
          <CopyEmailButton email={CONTACT_EMAIL} />
        </div>
      </section>

      <section className="flex flex-col gap-3 normal-case">
        <h2 className="text-2xl leading-tight">Atribuciones</h2>
        <p className="text-base leading-7 text-foreground">
          Esta aplicación utiliza software y recursos de código abierto:
        </p>
        <ul className="flex list-disc flex-col gap-2 pl-6 text-base leading-7 text-foreground">
          <li>
            Tipografía{" "}
            <a
              href="https://fonts.google.com/specimen/Cardo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Cardo
            </a>{" "}
            por David Perry, distribuida bajo{" "}
            <a
              href="https://openfontlicense.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              SIL Open Font License 1.1
            </a>
            .
          </li>
          <li>
            <a
              href="https://nextjs.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Next.js
            </a>
            ,{" "}
            <a
              href="https://react.dev/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              React
            </a>{" "}
            y{" "}
            <a
              href="https://tailwindcss.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Tailwind CSS
            </a>{" "}
            (licencia MIT).
          </li>
          <li>
            <a
              href="https://supabase.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Supabase
            </a>{" "}
            (licencia Apache 2.0).
          </li>
        </ul>
      </section>
    </main>
  );
}
