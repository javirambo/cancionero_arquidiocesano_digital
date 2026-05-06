import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Créditos · Cancionero Arquidiocesano",
  description:
    "Créditos del Cancionero Arquidiocesano y referencia al cantoral oficial.",
};

export default function CreditosPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
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
