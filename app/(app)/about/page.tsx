import type { Metadata } from "next";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { loadContactEmails } from "@/lib/contact-emails";
import { CopyEmailButton } from "../creditos/copy-email-button";

export const metadata: Metadata = {
  title: "¿Quiénes somos? · Cancionero Arquidiocesano",
  description: "Acerca de la Arquidiócesis de Rosario.",
};

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

export default async function AboutPage() {
  const [feedbackBgUrl, creditsEmails] = await Promise.all([
    getFeedbackCardBgUrl(),
    loadContactEmails("credits_contact_emails"),
  ]);
  const contactEmail = creditsEmails[0] ?? null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 bg-[#ffffff] px-4 py-16">
      <header className="flex flex-col">
        <h1 className="text-3xl leading-tight text-page-title">¿Quiénes somos?</h1>
      </header>

      <section className="flex flex-col gap-3 normal-case">
        <p className="text-base leading-7 text-foreground">
          El Cancionero Arquidiocesano es una herramienta común de la
          Arquidiócesis de Rosario para preparar el canto en la celebración
          litúrgica y en la oración comunitaria.
        </p>
        <p className="text-base leading-7 text-foreground">
          Reúne cantos, selecciones parroquiales y orientaciones litúrgicas
          para acompañar a coros, músicos, salmistas, equipos litúrgicos y
          fieles.
        </p>
        <p className="text-base leading-7 text-foreground">
          Esta iniciativa, animada por la Comisión Arquidiocesana de Liturgia,
          quiere servir a la vida celebrativa de nuestras comunidades y
          favorecer que el canto exprese la fe de la Iglesia.
        </p>
      </section>

      <div className="flex flex-col items-center gap-4">
        <Image
          src="/logo-arquidiocesis.png"
          alt="Arquidiócesis de Rosario"
          width={1024}
          height={1024}
          className="h-auto w-full max-w-sm"
        />
        <p
          className="text-center text-2xl font-bold text-foreground"
          style={{ fontFamily: "Arial, sans-serif" }}
        >
          Arzobispado de Rosario
        </p>
      </div>

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
            className="absolute inset-0 bg-sidebar/50"
          />
        )}
        <div className="relative flex flex-col gap-3">
          <h2 className="text-2xl leading-tight text-page-title">¿Tenés ideas para mejorar?</h2>
          <p className="text-base leading-7 text-foreground">
            Tu opinión es fundamental para nosotros. Si encontrás algún error,
            tenés una sugerencia o simplemente querés ayudarnos a crecer, no
            dudes en escribirnos.
          </p>
          {contactEmail && <CopyEmailButton email={contactEmail} />}
        </div>
      </section>
    </main>
  );
}
