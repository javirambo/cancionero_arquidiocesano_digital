import Link from "next/link";
import {
  listCommonAnnouncements,
  listLiturgicalAnnouncements,
  listSongsPaged,
} from "@/lib/songs";
import {
  listArchdiocesanPlaylists,
  listPlaylistsForParish,
  type PlaylistSummary,
} from "@/lib/playlists";
import { createClient } from "@/lib/supabase/server";
import { GoogleSignInButton } from "@/app/(app)/perfil/google-sign-in-button";
import { AnnouncementCard } from "@/app/components/announcement-card";
import { PlaylistCard } from "@/app/(app)/playlists/playlist-card";
import { SongsFrame } from "@/app/components/songs-frame";

const PREVIEW = 3;
const SONGS_PAGE_SIZE = 50;

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

type ParishLite = { id: string; slug: string; name: string };

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let primaryParish: ParishLite | null = null;
  let otherParishes: ParishLite[] = [];
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("parish_id")
      .eq("id", user.id)
      .maybeSingle();
    const primaryId = (profile?.parish_id as string | undefined) ?? null;
    if (primaryId) {
      const { data: pr } = await supabase
        .from("parishes")
        .select("id, slug, name")
        .eq("id", primaryId)
        .maybeSingle();
      if (pr) primaryParish = pr as ParishLite;
    }
    // Otras parroquias asociadas (excluida la principal), por joined_at desc.
    const { data: members } = await supabase
      .from("parish_members")
      .select("parish_id, joined_at, parishes(id, slug, name)")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: false });
    const others: ParishLite[] = [];
    for (const m of members ?? []) {
      const rel = m.parishes as ParishLite | ParishLite[] | null;
      const p = Array.isArray(rel) ? rel[0] : rel;
      if (!p) continue;
      if (primaryParish && p.id === primaryParish.id) continue;
      others.push(p);
    }
    otherParishes = others.slice(0, 2);
  }

  // Cargas en paralelo.
  const [
    primaryParishPlaylists,
    otherParishPlaylists,
    archdiocesan,
    liturgical,
    songsResult,
    novedades,
  ] = await Promise.all([
    primaryParish
      ? listPlaylistsForParish(primaryParish.id, {
          parishSlug: primaryParish.slug,
          excludeArchdiocesan: true,
          limit: PREVIEW,
        })
      : Promise.resolve([]),
    Promise.all(
      otherParishes.map((par) =>
        listPlaylistsForParish(par.id, {
          parishSlug: par.slug,
          excludeArchdiocesan: true,
          limit: PREVIEW,
        }).then((items) => ({ parish: par, items }))
      )
    ),
    listArchdiocesanPlaylists({ limit: PREVIEW }),
    listLiturgicalAnnouncements(PREVIEW),
    listSongsPaged(1, SONGS_PAGE_SIZE),
    listCommonAnnouncements(PREVIEW),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-6 py-12">
        {/* Header */}
        <section className="flex flex-col items-center gap-4 text-center">
          {primaryParish && (
            <p className="text-2xl text-secondary">{primaryParish.name}</p>
          )}
          <p className="text-sm uppercase tracking-[0.2em] text-secondary">
            Evangelizar a través de la música
          </p>
          <h1 className="text-4xl leading-tight sm:text-5xl">
            Cancionero Arquidiocesano
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-muted-foreground normal-case">
            Una herramienta común para coros, ministerios de música y asambleas
            de toda la Arquidiócesis.
          </p>
        </section>

        {/* Logueado: parroquia principal */}
        {user && primaryParish && primaryParishPlaylists.length > 0 && (
          <PlaylistsSection
            heading={`Playlists de ${primaryParish.name}`}
            playlists={primaryParishPlaylists}
            seeAllHref={`/parroquias/${primaryParish.slug}/playlists`}
          />
        )}

        {/* Logueado: hasta 2 parroquias asociadas */}
        {user &&
          otherParishPlaylists
            .filter((g) => g.items.length > 0)
            .map((g) => (
              <PlaylistsSection
                key={g.parish.id}
                heading={g.parish.name}
                playlists={g.items}
                seeAllHref={`/parroquias/${g.parish.slug}/playlists`}
              />
            ))}

        {/* Arquidiocesanas */}
        {archdiocesan.length > 0 && (
          <PlaylistsSection
            heading="Playlists recomendadas"
            playlists={archdiocesan}
            seeAllHref="/playlists"
          />
        )}

        {/* Anuncios litúrgicos */}
        {liturgical.items.length > 0 && (
          <AnnouncementsSection
            heading="Festividades y tiempos litúrgicos"
            items={liturgical.items}
            total={liturgical.total}
            seeAllHref="/novedades"
          />
        )}

        {/* Canciones */}
        <SongsFrame
          initialItems={songsResult.items}
          initialTotal={songsResult.total}
          pageSize={SONGS_PAGE_SIZE}
        />

        {/* Novedades */}
        {novedades.items.length > 0 && (
          <AnnouncementsSection
            heading="Novedades"
            items={novedades.items}
            total={novedades.total}
            seeAllHref="/novedades"
          />
        )}

        {/* Accesos rápidos */}
        <section aria-labelledby="accesos-heading" className="flex flex-col gap-4">
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

        {/* Iniciá sesión (solo invitado, al final) */}
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
      </main>
    </div>
  );
}

function PlaylistsSection({
  heading,
  playlists,
  seeAllHref,
}: {
  heading: string;
  playlists: PlaylistSummary[];
  seeAllHref: string;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl">{heading}</h2>
        <Link
          href={seeAllHref}
          className="text-xs uppercase tracking-[0.2em] text-secondary hover:text-primary"
        >
          Ver todas →
        </Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {playlists.map((p) => (
          <PlaylistCard
            key={p.id}
            playlist={{
              id: p.id,
              name: p.name,
              description: p.description,
              parish: p.parish,
            }}
          />
        ))}
      </ul>
    </section>
  );
}

function AnnouncementsSection({
  heading,
  items,
  total,
  seeAllHref,
}: {
  heading: string;
  items: ReturnType<typeof Object>;
  total: number;
  seeAllHref: string;
}) {
  // items tipado vía Featured pero evito ciclo de imports.
  const list = items as import("@/lib/songs").Featured[];
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl">{heading}</h2>
        {total > list.length && (
          <Link
            href={seeAllHref}
            className="text-xs uppercase tracking-[0.2em] text-secondary hover:text-primary"
          >
            Ver todas →
          </Link>
        )}
      </div>
      <ul className="grid gap-3">
        {list.map((item, i) => (
          <li key={i}>
            <AnnouncementCard item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

