import Link from "next/link";
import { redirect } from "next/navigation";
import {
  listDiocesanAnnouncements,
  listParishOnlyAnnouncements,
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
import { CardCarousel } from "@/app/components/card-carousel";
import { FeaturedAnnouncementPopup } from "@/app/components/featured-announcement-popup";
import { PlaylistCard } from "@/app/(app)/playlists/playlist-card";
import { SongsFrame } from "@/app/components/songs-frame";
import { HomeHero } from "@/app/components/home-hero";
import type { PublicCategoryOption } from "@/lib/songs";

const PREVIEW = 3;
const PLAYLIST_HOME_LIMIT = 4;
const SONGS_PAGE_SIZE = 50;

type ParishLite = { id: string; slug: string; name: string };

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ pwa?: string }>;
}) {
  const sp = await searchParams;
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

  // Arranque de la PWA instalada (start_url "/?pwa=1"): si el usuario tiene
  // parroquia principal, abrir directo ahí. Invitados y usuarios sin parroquia
  // principal siguen viendo la home.
  if (sp.pwa === "1" && primaryParish) {
    redirect(`/parroquias/${primaryParish.slug}`);
  }

  // Cargas en paralelo.
  const [
    primaryParishPlaylists,
    otherParishPlaylists,
    archdiocesan,
    diocesanAnnouncements,
    songsResult,
    parishAnnouncements,
    songCategories,
    featuredPopup,
  ] = await Promise.all([
    primaryParish
      ? listPlaylistsForParish(primaryParish.id, {
          parishSlug: primaryParish.slug,
          excludeArchdiocesan: true,
          limit: PLAYLIST_HOME_LIMIT,
        })
      : Promise.resolve([]),
    Promise.all(
      otherParishes.map((par) =>
        listPlaylistsForParish(par.id, {
          parishSlug: par.slug,
          excludeArchdiocesan: true,
          limit: PLAYLIST_HOME_LIMIT,
        }).then((items) => ({ parish: par, items }))
      )
    ),
    listArchdiocesanPlaylists({ limit: PLAYLIST_HOME_LIMIT }),
    listDiocesanAnnouncements(PREVIEW),
    listSongsPaged(1, SONGS_PAGE_SIZE),
    listParishOnlyAnnouncements(PREVIEW),
    listPublicCategories(),
    loadFeaturedAnnouncementPopup(),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      {featuredPopup && <FeaturedAnnouncementPopup item={featuredPopup} />}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-4 py-12">
        <HomeHero />

        {/* 1. AVISOS: avisos diocesanos (orden de prioridad) + playlists
            diocesanas debajo. */}
        {(diocesanAnnouncements.items.length > 0 || archdiocesan.length > 0) && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg text-page-title">Avisos</h2>
            {/* Los dos carousels mantienen su separación entre sí; el gap-2 de
                la sección solo achica la distancia del título al contenido. */}
            <div className="flex flex-col gap-6">
              {diocesanAnnouncements.items.length > 0 && (
                <CardCarousel>
                  {diocesanAnnouncements.items.map((a) => (
                    <li key={a.id}>
                      <AnnouncementCard item={a} compact />
                    </li>
                  ))}
                </CardCarousel>
              )}
              {archdiocesan.length > 0 && (
                <CardCarousel>
                  {archdiocesan.slice(0, PLAYLIST_HOME_LIMIT).map((p) => (
                    <PlaylistCard
                      key={p.id}
                      hideParish
                      compact
                      playlist={{
                        id: p.id,
                        name: p.name,
                        description: p.description,
                        image_path: p.image_path,
                        parish: p.parish,
                      }}
                    />
                  ))}
                </CardCarousel>
              )}
            </div>
          </section>
        )}

        {/* 2. SELECCIÓN PARROQUIAL: playlists que NO son diocesanas. */}
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
          if (merged.length === 0) return null;
          return (
            <PlaylistsSection
              heading="Selección parroquial"
              playlists={merged.slice(0, PLAYLIST_HOME_LIMIT)}
              seeAllHref="/playlists"
            />
          );
        })()}

        {/* 3. CATEGORÍAS: atajos a categorías de cantos */}
        <SongCategoryShortcuts categories={songCategories} />

        {/* 4. CANTOS */}
        <SongsFrame
          initialItems={songsResult.items}
          initialTotal={songsResult.total}
          pageSize={SONGS_PAGE_SIZE}
          categories={songCategories}
          showSeeAll={false}
        />

        {/* 5. AVISOS PARROQUIALES: solo anuncios de las parroquias del usuario. */}
        {parishAnnouncements.items.length > 0 && (
          <AnnouncementsSection
            heading="Avisos parroquiales"
            subheading={primaryParish?.name}
            items={parishAnnouncements.items}
            total={parishAnnouncements.total}
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
    <section className="flex flex-col gap-2">
      <h2 className="text-lg text-page-title">{heading}</h2>
      <CardCarousel>
        {playlists.map((p) => (
          <PlaylistCard
            key={p.id}
            compact
            playlist={{
              id: p.id,
              name: p.name,
              description: p.description,
              image_path: p.image_path,
              parish: p.parish,
            }}
          />
        ))}
      </CardCarousel>
    </section>
  );
}

function AnnouncementsSection({
  heading,
  subheading,
  items,
  total,
  seeAllHref,
}: {
  heading: string;
  subheading?: string;
  items: ReturnType<typeof Object>;
  total: number;
  seeAllHref: string;
}) {
  // items tipado vía Featured pero evito ciclo de imports.
  const list = items as import("@/lib/songs").Featured[];
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-lg text-page-title">{heading}</h2>
        {subheading && (
          <span className="text-sm normal-case text-secondary">
            {subheading}
          </span>
        )}
      </div>
      <CardCarousel>
        {list.map((item, i) => (
          <li key={i}>
            <AnnouncementCard item={item} compact />
          </li>
        ))}
      </CardCarousel>
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
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const shortcuts = SHORTCUT_SLUGS.flatMap((slug) => {
    // "Salmo responsorial" es un atajo FIJO a la página /salmos: no depende de
    // que exista la categoría (que se dio de baja).
    if (slug === "salmo-responsorial") {
      return [{ key: slug, name: "Salmo responsorial", href: "/salmos", tooltip: undefined }];
    }
    const c = bySlug.get(slug);
    if (!c) return [];
    // El tooltip muestra solo el texto previo al marcador ">>>".
    return [
      {
        key: slug,
        name: c.name,
        href: `/canciones?cat=${c.slug}`,
        tooltip: c.description?.split(">>>")[0].trim() || undefined,
      },
    ];
  });

  if (shortcuts.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg text-page-title">Categorías</h2>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {shortcuts.map((s) => (
          <li key={s.key}>
            <Link
              href={s.href}
              title={s.tooltip}
              className="flex h-full items-center justify-center rounded-xl border border-page-title bg-sidebar px-4 py-4 text-center text-sm uppercase text-page-title transition-opacity hover:opacity-90"
            >
              {s.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

