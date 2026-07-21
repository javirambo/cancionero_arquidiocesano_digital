import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getParishBySlug,
  listAnnouncementsForParish,
  loadFeaturedAnnouncementPopupForParish,
  listSongsPaged,
  listPublicCategories,
} from "@/lib/songs";
import { listPlaylistsForParish } from "@/lib/playlists";
import { createClient } from "@/lib/supabase/server";
import { AnnouncementCard } from "@/app/components/announcement-card";
import { FeaturedAnnouncementPopup } from "@/app/components/featured-announcement-popup";
import { CardCarousel } from "@/app/components/card-carousel";
import { PlaylistCard } from "@/app/(app)/playlists/playlist-card";
import { SongsFrame } from "@/app/components/songs-frame";
import { ParishDetails } from "./parish-details";

const SONGS_PAGE_SIZE = 50;

export default async function ParroquiaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "arquidiocesis") notFound();
  const parish = await getParishBySlug(slug);
  if (!parish) notFound();

  const [
    playlists,
    songsResult,
    songCategories,
    parishAnnouncements,
    featuredPopup,
  ] = await Promise.all([
    listPlaylistsForParish(parish.id, { parishSlug: parish.slug }),
    listSongsPaged(1, SONGS_PAGE_SIZE),
    listPublicCategories(),
    // Los avisos de la parroquia son públicos (RLS abierta desde mig.
    // 0035): se cargan para cualquier visitante, incluso sin sesión.
    listAnnouncementsForParish(parish.id),
    // Popup destacado: anuncio featured asignado a ESTA parroquia.
    loadFeaturedAnnouncementPopupForParish(parish.id),
  ]);
  const previewPlaylists = playlists.slice(0, 4);

  const supabase = await createClient();

  // Determino el rol del visitante para esta parroquia, así sé qué
  // contactos mostrar en la sección "Contacto" y qué anuncios cargar.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  let isEditor = false;
  let isCoordinatorOfThisParish = false;

  if (user) {
    const [memberRes, rolesRes] = await Promise.all([
      supabase
        .from("parish_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("parish_id", parish.id)
        .maybeSingle(),
      supabase
        .from("user_roles")
        .select("roles(name)")
        .eq("user_id", user.id),
    ]);
    if (memberRes.data) {
      isCoordinatorOfThisParish = memberRes.data.role === "coordinator";
    }
    const roleNames =
      (rolesRes.data ?? [])
        .map((r: { roles: { name: string } | { name: string }[] | null }) => {
          const roles = r.roles;
          if (Array.isArray(roles)) return roles[0]?.name;
          return roles?.name;
        })
        .filter(Boolean) as string[];
    isAdmin = roleNames.includes("admin");
    isEditor = roleNames.includes("editor");
  }
  const canEdit = isAdmin || isEditor || isCoordinatorOfThisParish;

  // Reglas de "Contacto" (CU-06.2). Todos los contactos salen de DB
  // (parish_members.role='coordinator' o user_roles editor/admin); no
  // hay setting de respaldo para roles.
  //   - Admin: sección oculta.
  //   - Editor: admins globales.
  //   - Coordinator de esta parroquia: editores + admins (dedup).
  //   - Resto autenticado: coordinators de la parroquia; si no hay,
  //     fallback a editores.
  //   - Invitado: coordinators de la parroquia; si no hay, sección oculta.
  type ContactRow = {
    user_id: string;
    display_name: string | null;
    email: string;
    avatar_url: string | null;
  };
type ContactGroup = {
    role: "coordinator" | "editor" | "admin";
    message: string;
    contacts: ContactRow[];
  };
  const contactGroups: ContactGroup[] = [];
  const seenUserIds = new Set<string>();
  const seenEmails = new Set<string>();
  function pushGroup(group: ContactGroup) {
    const fresh: ContactRow[] = [];
    for (const c of group.contacts) {
      const emailKey = c.email.trim().toLowerCase();
      if (seenUserIds.has(c.user_id) || seenEmails.has(emailKey)) continue;
      seenUserIds.add(c.user_id);
      seenEmails.add(emailKey);
      fresh.push(c);
    }
    if (fresh.length > 0) {
      contactGroups.push({ ...group, contacts: fresh });
    }
  }

  // 1) Coordinadores de la parroquia — siempre para todos los roles.
  const { data: coordsRaw } = await supabase.rpc("get_parish_coordinators", {
    p_parish_id: parish.id,
  });
  const coordinators = (coordsRaw ?? []) as ContactRow[];
  pushGroup({
    role: "coordinator",
    message:
      "Por cualquier sugerencia puede contactarse con el Coordinador Parroquial",
    contacts: coordinators,
  });

  // 2) Bloque por rol del visitante (suma a lo anterior, sin duplicar).
  if (isEditor) {
    const { data } = await supabase.rpc("get_users_by_global_role", {
      p_role: "admin",
    });
    pushGroup({
      role: "admin",
      message:
        "Para cuestiones administrativas puede contactarse con un Administrador",
      contacts: (data ?? []) as ContactRow[],
    });
  } else if (isCoordinatorOfThisParish) {
    const [eds, ads] = await Promise.all([
      supabase.rpc("get_users_by_global_role", { p_role: "editor" }),
      supabase.rpc("get_users_by_global_role", { p_role: "admin" }),
    ]);
    pushGroup({
      role: "editor",
      message:
        "Para cuestiones editoriales puede contactarse con un Editor o Administrador",
      contacts: [
        ...((eds.data ?? []) as ContactRow[]),
        ...((ads.data ?? []) as ContactRow[]),
      ],
    });
  } else if (user && !isAdmin) {
    // member común: editores como fallback.
    if (coordinators.length === 0) {
      const { data: eds } = await supabase.rpc("get_users_by_global_role", {
        p_role: "editor",
      });
      pushGroup({
        role: "editor",
        message:
          "Para cuestiones editoriales puede contactarse con un Editor o Administrador",
        contacts: (eds ?? []) as ContactRow[],
      });
    }
  }


  return (
    <>
      {featuredPopup && <FeaturedAnnouncementPopup item={featuredPopup} />}
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 pb-12 pt-4">
      <header className="flex flex-col gap-3">
        <ParishDetails
          name={parish.parent_id ? parish.name : `Parroquia ${parish.name}`}
          editHref={canEdit ? `/parroquias/${parish.slug}/editar` : null}
          address={parish.address ?? null}
          city={parish.city ?? null}
          description={parish.description ?? null}
          parentName={parish.parent_id ? parish.parent?.name ?? null : null}
          email={parish.email ?? null}
          phone={parish.phone ?? null}
          url={parish.url ?? null}
        />
      </header>

      <section aria-labelledby="playlists-heading" className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="playlists-heading" className="text-lg text-page-title">
            Listas de cantos
          </h2>
          <div className="flex items-center gap-3">
            {!isCoordinatorOfThisParish && (
              <Link
                href={`/parroquias/${parish.slug}/playlists`}
                className="text-sm normal-case text-primary hover:underline"
              >
                Ver todas
              </Link>
            )}
            {isCoordinatorOfThisParish && (
              <Link
                href={`/parroquias/${parish.slug}/playlists`}
                className="rounded-full border border-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary hover:bg-primary hover:text-primary-foreground"
              >
                Editar
              </Link>
            )}
          </div>
        </div>
        {previewPlaylists.length === 0 ? (
          <p className="rounded-xl border border-border bg-background p-6 text-base normal-case text-muted-foreground">
            Esta parroquia todavía no publicó playlists.
          </p>
        ) : (
          <CardCarousel>
            {previewPlaylists.map((p) => (
              <PlaylistCard
                key={p.id}
                hideParish
                compact
                badge={
                  p.relation === "archdiocesan"
                    ? "De la Arquidiócesis"
                    : p.relation === "subscribed" && p.parish
                      ? `Compartida por ${p.parish.name}`
                      : null
                }
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
      </section>

      {(parishAnnouncements.items.length > 0 || isCoordinatorOfThisParish) && (
        <section
          aria-labelledby="anuncios-heading"
          className="flex flex-col gap-2"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="anuncios-heading" className="text-lg text-page-title">
              Avisos
            </h2>
            {isCoordinatorOfThisParish && (
              <Link
                href={`/parroquias/${parish.slug}/anuncios`}
                className="rounded-full border border-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary hover:bg-primary hover:text-primary-foreground"
              >
                Editar
              </Link>
            )}
          </div>
          {parishAnnouncements.items.length === 0 ? (
            <p className="rounded-xl border border-border bg-background p-6 text-base normal-case text-muted-foreground">
              Esta parroquia todavía no publicó avisos.
            </p>
          ) : (
            <CardCarousel>
              {parishAnnouncements.items.map((item, i) => (
                <li key={i}>
                  <AnnouncementCard item={item} compact />
                </li>
              ))}
            </CardCarousel>
          )}
        </section>
      )}

      <SongsFrame
        initialItems={songsResult.items}
        initialTotal={songsResult.total}
        pageSize={SONGS_PAGE_SIZE}
        categories={songCategories}
        showSeeAll={false}
      />

      {contactGroups.length > 0 && (
        <section
          aria-labelledby="contacto-heading"
          className="flex flex-col gap-2"
        >
          <div className="flex flex-col gap-1">
            <h2 id="contacto-heading" className="text-lg text-page-title">
              Contacto
            </h2>
            <p className="text-sm normal-case text-muted-foreground">
              Estos son los contactos por si necesita comunicarse con un
              coordinador parroquial o de la comisión arquidiocesana.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {contactGroups.flatMap((group) =>
              group.contacts.map((c) => {
                const name = c.display_name ?? c.email;
                const initial = name.charAt(0).toUpperCase();
                const roleLabel =
                  group.role === "coordinator"
                    ? "Coordinador Parroquial"
                    : group.role === "editor"
                    ? "Editor"
                    : "Administrador";
                return (
                  <li
                    key={c.user_id}
                    className="flex items-center gap-4 rounded-xl border border-border bg-card p-5"
                  >
                    {c.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.avatar_url}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div
                        aria-hidden="true"
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sidebar text-lg text-primary"
                      >
                        {initial}
                      </div>
                    )}
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-xs uppercase tracking-[0.15em] text-secondary">
                        {roleLabel}
                      </span>
                      <span className="truncate text-lg text-primary">
                        {name}
                      </span>
                      <a
                        href={`mailto:${c.email}`}
                        className="truncate text-sm normal-case text-muted-foreground hover:text-primary hover:underline"
                      >
                        {c.email}
                      </a>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </section>
      )}
      </main>
    </>
  );
}
