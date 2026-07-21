import type { Metadata } from "next";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { loadContactEmails } from "@/lib/contact-emails";
import { CopyEmailButton } from "./copy-email-button";

export const metadata: Metadata = {
  title: "Créditos · Cancionero Arquidiocesano",
  description:
    "Créditos del Cancionero Arquidiocesano y referencia al cantoral oficial.",
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

export default async function CreditosPage() {
  const [feedbackBgUrl, creditsEmails] = await Promise.all([
    getFeedbackCardBgUrl(),
    loadContactEmails("credits_contact_emails"),
  ]);
  const contactEmail = creditsEmails[0] ?? null;
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 bg-[#ffffff] px-4 py-16">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-4xl leading-tight text-primary sm:text-5xl">
          Cancionero Arquidiocesano
        </h1>
      </div>
      <header className="flex flex-col">
        <h1 className="text-3xl leading-tight text-page-title">Créditos</h1>
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

      <div className="flex justify-center">
        <Image
          src="/logo-full.png"
          alt="Logo Comisión de Música Litúrgica"
          width={1855}
          height={926}
          className="h-auto w-full max-w-sm"
        />
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

      <section className="flex flex-col gap-2 normal-case">
        <h2 className="text-xl leading-tight text-page-title">Atribuciones</h2>
        <p className="text-sm leading-6 text-foreground">
          Esta aplicación utiliza software y recursos de código abierto:
        </p>
        <ul className="flex list-disc flex-col gap-1 pl-6 text-sm leading-6 text-foreground">
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
        <p className="text-sm leading-6 text-foreground">
          Algunos textos y partituras: © Coro San Clemente –{" "}
          <a
            href="https://www.corosanclemente.com.ar"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            www.corosanclemente.com.ar
          </a>
        </p>
      </section>
    </main>
  );
}
