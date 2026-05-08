import Link from "next/link";
import {
  listCommonAnnouncements,
  listLiturgicalAnnouncements,
  listPublicCategories,
  listSongsPaged,
} from "@/lib/songs";
import {
  listArchdiocesanPlaylists,
  listPlaylistsForParish,
  type PlaylistSummary,
} from "@/lib/playlists";
import { createClient } from "@/lib/supabase/server";
import { GoogleSignInButton } from "@/app/components/google-sign-in-button";
import { AnnouncementCard } from "@/app/components/announcement-card";
import { PlaylistCard } from "@/app/(app)/playlists/playlist-card";
import { SongsFrame } from "@/app/components/songs-frame";
import { HomeHero } from "@/app/components/home-hero";

const PREVIEW = 3;
const PLAYLIST_HOME_LIMIT = 4;
const SONGS_PAGE_SIZE = 50;

type ParishLite = { id: string; slug: string; name: string };

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let primaryParish: ParishLite | null = null;
  let otherParishes: ParishLite[] = [];
  if (user) {
    const [profileRes, membersRes] = await Promise.all([
      supabase.from("users").select("parish_id").eq("id", user.id).maybeSingle(),
      supabase
        .from("parish_members")
        .select("parish_id, joined_at, parishes(id, slug, name)")
        .eq("user_id", user.id)
        .order("joined_at", { ascending: false }),
    ]);
    const primaryId = (profileRes.data?.parish_id as string | undefined) ?? null;
    const memberParishIds = new Set(
      (membersRes.data ?? []).map((m) => m.parish_id as string)
    );
    // Defensivo: solo aceptar primaryId si el user es realmente miembro.
    if (primaryId && memberParishIds.has(primaryId)) {
      const { data: pr } = await supabase
        .from("parishes")
        .select("id, slug, name")
        .eq("id", primaryId)
        .maybeSingle();
      if (pr) primaryParish = pr as ParishLite;
    }
    // Otras parroquias asociadas (excluida la principal), por joined_at desc.
    const others: ParishLite[] = [];
    for (const m of membersRes.data ?? []) {
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
    songCategories,
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
    listPublicCategories(),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-4 py-12">
        <HomeHero parishName={primaryParish?.name ?? null} />

        {/* Playlists: una sola sección mezclada, dedupe, máximo 4. */}
        {(() => {
          const merged: PlaylistSummary[] = [];
          const seen = new Set<string>();
          const push = (p: PlaylistSummary) => {
            if (seen.has(p.id)) return;
            seen.add(p.id);
            merged.push(p);
          };
          primaryParishPlaylists.forEach(push);
          otherParishPlaylists.forEach((g) => g.items.forEach(push));
          archdiocesan.forEach(push);
          if (merged.length === 0) return null;
          return (
            <PlaylistsSection
              heading="Listas"
              playlists={merged.slice(0, PLAYLIST_HOME_LIMIT)}
              seeAllHref="/playlists"
            />
          );
        })()}

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
          categories={songCategories}
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
      <div className="flex items-center justify-between gap-3">
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
              image_path: p.image_path,
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
      <div className="flex items-center justify-between gap-3">
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

