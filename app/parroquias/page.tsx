import Link from "next/link";
import { listParishes } from "@/lib/songs";

export const metadata = {
  title: "Parroquias · Cancionero Arquidiocesano",
};

export default async function ParroquiasPage() {
  const parishes = await listParishes();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl">Parroquias</h1>
        <p className="text-base normal-case text-muted-foreground">
          Comunidades de la Arquidiócesis con sus repertorios.
        </p>
      </header>

      {parishes.length === 0 ? (
        <p className="rounded-xl border border-border bg-sidebar p-6 text-base normal-case text-muted-foreground">
          Todavía no hay parroquias publicadas.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {parishes.map((p) => (
            <li key={p.id}>
              <Link
                href={`/parroquias/${p.slug}`}
                className="flex h-full flex-col gap-1 rounded-xl border border-border bg-background p-5 transition-colors hover:border-primary"
              >
                <span className="text-lg text-primary">{p.name}</span>
                {(p.address || p.city) && (
                  <span className="text-xs normal-case text-muted-foreground">
                    {[p.address, p.city].filter(Boolean).join(" · ")}
                  </span>
                )}
                {p.description && (
                  <span className="mt-2 text-sm normal-case text-muted-foreground">
                    {p.description}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
