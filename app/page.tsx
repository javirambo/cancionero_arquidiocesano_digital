import Link from "next/link";
import { version } from "@/package.json";
import { getEventForToday, listActiveFeatured } from "@/lib/songs";
import { getLiturgicalDay } from "@/lib/liturgical";

type AccesoRapido = {
  href: string;
  titulo: string;
  descripcion: string;
};

const accesos: AccesoRapido[] = [
  {
    href: "/canciones",
    titulo: "Canciones",
    descripcion: "Letras, acordes y partituras del repertorio litúrgico.",
  },
  {
    href: "/playlists",
    titulo: "Playlists",
    descripcion: "Repertorios armados por parroquias y festividades.",
  },
  {
    href: "/parroquias",
    titulo: "Parroquias",
    descripcion: "Comunidades de la Arquidiócesis y su música propia.",
  },
];

export default async function Home() {
  const [event, featured] = await Promise.all([
    getEventForToday(),
    listActiveFeatured(),
  ]);
  const litDay = getLiturgicalDay();

  const today = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // Datos a mostrar: la festividad cargada en DB tiene prioridad porque
  // suele venir con playlist asociada. Si no hay, caemos al calendario
  // litúrgico calculado por romcal.
  const headline = event
    ? { kicker: "Festividad de hoy", title: event.name, description: event.description, season: null as string | null }
    : litDay
    ? {
        kicker: today,
        // Si es feria mostramos el tiempo litúrgico como título.
        title:
          litDay.rank <= 4 // solemnidad / domingo / fiesta / memoria
            ? litDay.name
            : litDay.seasonName,
        description:
          litDay.rank <= 4
            ? `${litDay.seasonName} · ${litDay.date}`
            : "Hoy no hay festividad destacada. Explorá el repertorio o las playlists de las parroquias.",
        season: litDay.seasonName,
      }
    : { kicker: today, title: "Tiempo Ordinario", description: null, season: null };

  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-6 py-16">
        <section className="flex flex-col items-center gap-6 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-secondary">
            Evangelizar a través de la música
          </p>
          <h1 className="text-4xl leading-tight sm:text-5xl">
            Cancionero Arquidiocesano Digital
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-muted-foreground normal-case">
            Una herramienta común para coros, ministerios de música y asambleas
            de toda la Arquidiócesis. Buscá una canción, abrí el repertorio de
            tu parroquia o seguí la festividad del día.
          </p>

          <form
            action="/canciones"
            method="get"
            role="search"
            className="mt-4 flex w-full max-w-xl items-center gap-2 rounded-full border border-border bg-background px-5 py-3 shadow-sm focus-within:border-primary"
          >
            <label htmlFor="q" className="sr-only">
              Buscar canción, playlist o parroquia
            </label>
            <input
              id="q"
              name="q"
              type="search"
              placeholder="Buscar canción, playlist o parroquia…"
              autoComplete="off"
              className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-primary-hover"
            >
              Buscar
            </button>
          </form>
        </section>

        <section
          aria-labelledby="festividad-heading"
          className="rounded-2xl border border-border bg-sidebar p-8"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-secondary">
            {headline.kicker}
          </p>
          <h2 id="festividad-heading" className="mt-2 text-2xl">
            {headline.title}
          </h2>
          {headline.description && (
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground normal-case">
              {headline.description}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            {event?.playlist && event.playlist.parish_slug ? (
              <Link
                href={`/playlists/${event.playlist.parish_slug}/${event.playlist.slug}`}
                className="rounded-full border border-primary px-5 py-2 text-sm font-semibold uppercase tracking-wide text-primary transition-colors hover:bg-primary hover:text-white"
              >
                Ver playlist sugerida
              </Link>
            ) : (
              <Link
                href="/playlists"
                className="rounded-full border border-primary px-5 py-2 text-sm font-semibold uppercase tracking-wide text-primary transition-colors hover:bg-primary hover:text-white"
              >
                Ver playlists
              </Link>
            )}
            <Link
              href="/canciones"
              className="rounded-full px-5 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:text-primary"
            >
              Ir al catálogo
            </Link>
          </div>
        </section>

        {featured.length > 0 && (
          <section aria-labelledby="novedades-heading" className="flex flex-col gap-4">
            <h2 id="novedades-heading" className="text-xl">
              Novedades
            </h2>
            <ul className="grid gap-3">
              {featured.map((f, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-border bg-background p-5"
                >
                  <p className="text-base text-primary">{f.title}</p>
                  {f.body && (
                    <p className="mt-1 text-sm normal-case leading-6 text-muted-foreground">
                      {f.body}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="accesos-heading" className="flex flex-col gap-6">
          <h2 id="accesos-heading" className="text-xl">
            Accesos rápidos
          </h2>
          <ul className="grid gap-4 sm:grid-cols-3">
            {accesos.map((acceso) => (
              <li key={acceso.href}>
                <Link
                  href={acceso.href}
                  className="flex h-full flex-col gap-2 rounded-xl border border-border bg-background p-6 transition-colors hover:border-primary"
                >
                  <span className="text-lg text-primary">{acceso.titulo}</span>
                  <span className="text-sm leading-6 text-muted-foreground normal-case">
                    {acceso.descripcion}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-border bg-sidebar">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-1 px-6 py-6 text-center text-xs normal-case text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
          <span>Arquidiócesis de Rosario · Comisión Litúrgico-Musical</span>
          <span>Versión {version}</span>
        </div>
      </footer>
    </div>
  );
}
