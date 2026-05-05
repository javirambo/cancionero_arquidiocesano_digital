import Link from "next/link";
import { getEventForToday, listActiveFeatured } from "@/lib/songs";
import { getLiturgicalDay } from "@/lib/liturgical";
import { createClient } from "@/lib/supabase/server";
import { formatearFecha, hoyEnCordoba } from "@/lib/dates";
import { GoogleSignInButton } from "@/app/perfil/google-sign-in-button";

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
  const supabase = await createClient();
  const [{ data: { user } }, event, featured] = await Promise.all([
    supabase.auth.getUser(),
    getEventForToday(),
    listActiveFeatured(),
  ]);

  let primaryParishName: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("parish_id")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.parish_id) {
      const { data: parishRow } = await supabase
        .from("parishes")
        .select("name")
        .eq("id", profile.parish_id as string)
        .maybeSingle();
      primaryParishName = (parishRow?.name as string | undefined) ?? null;
    }
  }

  // Pasamos la fecha de hoy en Cordoba (mediodía UTC) para que
  // getLiturgicalDay no tome el día UTC del runtime del server.
  const litDay = await getLiturgicalDay(new Date(`${hoyEnCordoba()}T12:00:00Z`));

  const today = formatearFecha(new Date(), {
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
            : "Hoy no hay festividad destacada.",
        season: litDay.seasonName,
      }
    : { kicker: today, title: "Tiempo Ordinario", description: null, season: null };

  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-6 py-16">
        <section className="flex flex-col items-center gap-6 text-center">
          {primaryParishName && (
            <p className="text-2xl text-secondary">
              {primaryParishName}
            </p>
          )}
          <p className="text-sm uppercase tracking-[0.2em] text-secondary">
            Evangelizar a través de la música
          </p>
          <h1 className="text-4xl leading-tight sm:text-5xl">
            Cancionero Arquidiocesano
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-muted-foreground normal-case">
            Una herramienta común para coros, ministerios de música y asambleas
            de toda la Arquidiócesis. Buscá una canción, abrí el repertorio de
            tu parroquia o seguí la festividad del día.
          </p>
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
        </section>

        {!user && (
          <section
            aria-labelledby="invitado-heading"
            className="rounded-2xl border border-border bg-sidebar p-8"
          >
            <h2 id="invitado-heading" className="text-2xl">
              Iniciá sesión
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground normal-case">
              Asociate a parroquias, guardá tus favoritos en la nube y creá tus
              propias playlists.
            </p>
            <GoogleSignInButton />
          </section>
        )}

        {featured.length > 0 && (
          <section aria-labelledby="novedades-heading" className="flex flex-col gap-4">
            <h2 id="novedades-heading" className="text-xl">
              Novedades
            </h2>
            <ul className="grid gap-3">
              {featured.map((f, i) => {
                const isExternal = f.target_kind === "external" && f.href;
                const cardClass =
                  "block rounded-xl border border-border bg-background p-5 transition-colors hover:border-primary";
                const content = (
                  <>
                    <p className="text-base text-primary">{f.title}</p>
                    {f.body && (
                      <p className="mt-1 text-sm normal-case leading-6 text-muted-foreground">
                        {f.body}
                      </p>
                    )}
                  </>
                );

                if (f.href && isExternal) {
                  return (
                    <li key={i}>
                      <a
                        href={f.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cardClass}
                      >
                        {content}
                      </a>
                    </li>
                  );
                }
                if (f.href) {
                  return (
                    <li key={i}>
                      <Link href={f.href} className={cardClass}>
                        {content}
                      </Link>
                    </li>
                  );
                }
                return (
                  <li
                    key={i}
                    className="rounded-xl border border-border bg-background p-5"
                  >
                    {content}
                  </li>
                );
              })}
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
    </div>
  );
}
