import Link from "next/link";
import {
  listCommonAnnouncements,
  listLiturgicalAnnouncements,
  listPublicCategories,
  listSongsPaged,
  loadFeaturedAnnouncementPopup,
} from "@/lib/songs";
import {
  listArchdiocesanPlaylists,
  listPlaylistsForParish,
  type PlaylistSummary,
} from "@/lib/playlists";
import { createClient } from "@/lib/supabase/server";
import { GoogleSignInButton } from "@/app/components/google-sign-in-button";
import { AnnouncementCard } from "@/app/components/announcement-card";
import { FeaturedAnnouncementPopup } from "@/app/components/featured-announcement-popup";
import { PlaylistCard } from "@/app/(app)/playlists/playlist-card";
import { SongsFrame } from "@/app/components/songs-frame";
import { HomeHero } from "@/app/components/home-hero";
import { HelpHint } from "@/app/components/help-hint";
import type { PublicCategoryOption } from "@/lib/songs";

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
    featuredPopup,
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
    listLiturgicalAnnouncements(PREVIEW, "home"),
    listSongsPaged(1, SONGS_PAGE_SIZE),
    listCommonAnnouncements(PREVIEW, "home"),
    listPublicCategories(),
    loadFeaturedAnnouncementPopup(),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      {featuredPopup && <FeaturedAnnouncementPopup item={featuredPopup} />}
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
              heading="Selección parroquial"
              playlists={merged.slice(0, PLAYLIST_HOME_LIMIT)}
              seeAllHref="/playlists"
            />
          );
        })()}

        {/* Anuncios litúrgicos. En la home excluimos kind=indicaciones
            salvo que el anuncio esté destacado (featured=true); el resto
            de indicaciones vive en /orientaciones-liturgicas. */}
        {(() => {
          const items = liturgical.items.filter(
            (it) => it.kind !== "indicaciones" || it.featured
          );
          if (items.length === 0) return null;
          return (
            <AnnouncementsSection
              heading="Avisos"
              items={items}
              total={items.length}
              seeAllHref="/novedades"
            />
          );
        })()}

        {/* Atajos a categorías de cantos */}
        <SongCategoryShortcuts categories={songCategories} />

        {/* Canciones */}
        <SongsFrame
          initialItems={songsResult.items}
          initialTotal={songsResult.total}
          pageSize={SONGS_PAGE_SIZE}
          categories={songCategories}
          showSeeAll={false}
        />

        {/* Novedades */}
        {novedades.items.length > 0 && (
          <AnnouncementsSection
            heading="Avisos"
            items={novedades.items}
            total={novedades.total}
            seeAllHref="/novedades"
          />
        )}


        {/* Iniciá sesión (solo invitado, al final) */}
        {!user && (
          <section
            aria-labelledby="invitado-heading"
            className="rounded-2xl border border-border bg-background p-8"
          >
            <h2 id="invitado-heading" className="text-2xl text-page-title">
              Iniciá sesión
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground normal-case">
              Asociate a parroquias, sincroniza con tus otros dispositivos
              celulares y computadoras, y creá tus propias listas de cantos.
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
      <h2 className="text-xl text-page-title">{heading}</h2>
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
      <h2 className="text-xl text-page-title">{heading}</h2>
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

const SHORTCUT_SLUGS = [
  "ordinario-de-la-misa",
  "salmo-responsorial",
  "cantos-para-la-misa",
  "adoracion-y-oracion",
];

function SongCategoryShortcuts({
  categories,
}: {
  categories: PublicCategoryOption[];
}) {
  const shortcuts = SHORTCUT_SLUGS.map((slug) =>
    categories.find((c) => c.slug === slug)
  ).filter((c): c is PublicCategoryOption => Boolean(c));

  if (shortcuts.length === 0) return null;

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {shortcuts.map((c) => (
        <li key={c.slug} className="relative">
          <Link
            href={`/canciones?cat=${c.slug}`}
            title={c.description ?? undefined}
            className="flex h-full items-center justify-center rounded-xl border border-shortcut bg-shortcut px-4 py-4 text-center text-base uppercase text-white transition-opacity hover:opacity-90"
          >
            {c.name}
          </Link>
          {c.description && (
            <span className="absolute right-2 top-2 text-white sm:hidden">
              <HelpHint label={`Descripción de ${c.name}`}>
                {c.description}
              </HelpHint>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

