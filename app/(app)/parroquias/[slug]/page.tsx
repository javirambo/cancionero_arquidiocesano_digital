import Link from "next/link";
import { notFound } from "next/navigation";
import { getParishBySlug, listAnnouncementsForParish } from "@/lib/songs";
import { listPlaylistsForParish } from "@/lib/playlists";
import { createClient } from "@/lib/supabase/server";
import { AnnouncementCard } from "@/app/components/announcement-card";

export default async function ParroquiaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "arquidiocesis") notFound();
  const parish = await getParishBySlug(slug);
  if (!parish) notFound();

  const playlists = await listPlaylistsForParish(parish.id, { parishSlug: parish.slug });
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
  let parishAnnouncements: Awaited<
    ReturnType<typeof listAnnouncementsForParish>
  > = { items: [], total: 0 };

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
      parishAnnouncements = await listAnnouncementsForParish(parish.id);
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
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs uppercase tracking-[0.2em] text-secondary">
            Parroquia
          </p>
          {canEdit && (
            <Link
              href={`/parroquias/${parish.slug}/editar`}
              className="rounded-full border border-primary px-4 py-2 text-sm font-semibold uppercase tracking-wide text-primary hover:bg-primary hover:text-primary-foreground"
            >
              Editar
            </Link>
          )}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-4">
          {parish.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={parish.logo_url}
              alt=""
              className="h-16 w-16 shrink-0 rounded-full border border-border object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-border bg-sidebar text-2xl text-primary"
            >
              {parish.name.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="min-w-0 text-3xl text-page-title">{parish.name}</h1>
        </div>

        <dl className="flex flex-col gap-1 text-sm normal-case text-muted-foreground">
          {(parish.address || parish.city) && (
            <div>{[parish.address, parish.city].filter(Boolean).join(", ")}</div>
          )}
          {parish.description && (
            <div className="max-w-2xl whitespace-pre-line border-l-2 border-destructive pl-3 text-base italic">
              {parish.description}
            </div>
          )}
          {parish.parent_id && parish.parent?.name && (
            <div>Sede: {parish.parent.name}</div>
          )}
          {(parish.email || parish.phone) && (
            <div className="flex flex-wrap items-center gap-x-2">
              {parish.email && (
                <span>
                  Correo:{" "}
                  <a
                    href={`mailto:${parish.email}`}
                    className="hover:text-primary hover:underline"
                  >
                    {parish.email}
                  </a>
                </span>
              )}
              {parish.email && parish.phone && <span aria-hidden="true">·</span>}
              {parish.phone && (
                <span>
                  Tel:{" "}
                  <a
                    href={`tel:${parish.phone}`}
                    className="hover:text-primary hover:underline"
                  >
                    {parish.phone}
                  </a>
                </span>
              )}
            </div>
          )}
          {parish.url && (
            <div>
              <a
                href={parish.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-primary hover:underline"
              >
                <span>{prettyHost(parish.url)}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>
          )}
        </dl>
      </header>

      <section aria-labelledby="playlists-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="playlists-heading" className="text-xl">
            Listas
          </h2>
          <div className="flex items-center gap-3">
            {playlists.length > previewPlaylists.length && (
              <Link
                href={`/parroquias/${parish.slug}/playlists`}
                className="text-sm normal-case text-primary hover:underline"
              >
                Ver todas ({playlists.length})
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
          <ul className="grid gap-4 sm:grid-cols-2">
            {previewPlaylists.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/playlists/${p.id}`}
                  className="flex h-full flex-col gap-2 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary"
                >
                  <span className="text-lg text-primary">{p.name}</span>
                  {p.relation === "archdiocesan" && (
                    <span className="text-xs uppercase tracking-wide text-secondary">
                      De la Arquidiócesis
                    </span>
                  )}
                  {p.relation === "subscribed" && p.parish && (
                    <span className="text-xs uppercase tracking-wide text-secondary">
                      Compartida por {p.parish.name}
                    </span>
                  )}
                  {p.description && (
                    <span className="text-sm normal-case text-muted-foreground">
                      {p.description}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(parishAnnouncements.items.length > 0 || isCoordinatorOfThisParish) && (
        <section
          aria-labelledby="anuncios-heading"
          className="flex flex-col gap-4"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="anuncios-heading" className="text-xl">
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
            <ul className="grid gap-3">
              {parishAnnouncements.items.map((item, i) => (
                <li key={i}>
                  <AnnouncementCard item={item} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {contactGroups.length > 0 && (
        <section
          aria-labelledby="contacto-heading"
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1">
            <h2 id="contacto-heading" className="text-xl">
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
  );
}

function prettyHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
