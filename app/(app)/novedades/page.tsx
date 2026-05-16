// NOTA (fase 2, 2026-05): esta página queda sin enlace desde el menú principal.
// El item del menú "Orientaciones litúrgicas" ahora apunta a
// /orientaciones-liturgicas (página nueva, placeholder). /novedades sigue
// accesible escribiendo la URL directa por si necesitamos volver a usarla.
import {
  listCommonAnnouncements,
  listLiturgicalAnnouncements,
} from "@/lib/songs";
import { AnnouncementCard } from "@/app/components/announcement-card";

export const metadata = {
  title: "Avisos · Cancionero Arquidiocesano",
};

export default async function NovedadesPage() {
  const [liturgical, common] = await Promise.all([
    listLiturgicalAnnouncements(undefined, "home"),
    listCommonAnnouncements(undefined, "home"),
  ]);

  const empty = liturgical.items.length === 0 && common.items.length === 0;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-4 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl text-page-title">Avisos</h1>
        <p className="text-base normal-case text-muted-foreground">
          Festividades, tiempos litúrgicos y avisos vigentes en la
          Arquidiócesis.
        </p>
      </header>

      {empty && (
        <p className="rounded-xl border border-border bg-background p-6 text-base normal-case text-muted-foreground">
          No hay avisos vigentes en este momento.
        </p>
      )}

      {liturgical.items.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xs uppercase tracking-[0.2em] text-secondary">
            Festividades y tiempos litúrgicos
          </h2>
          <ul className="grid gap-3">
            {liturgical.items.map((item, i) => (
              <li key={i}>
                <AnnouncementCard item={item} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {common.items.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xs uppercase tracking-[0.2em] text-secondary">
            Avisos
          </h2>
          <ul className="grid gap-3">
            {common.items.map((item, i) => (
              <li key={i}>
                <AnnouncementCard item={item} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
