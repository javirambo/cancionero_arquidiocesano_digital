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
  const canEdit = isAdmin || isEditor;

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
  let contacts: ContactRow[] = [];
  let contactRoleLabel: "coordinator" | "editor" | "admin" | null =
    "coordinator";

  if (isAdmin) {
    contactRoleLabel = null;
  } else if (isEditor) {
    const { data } = await supabase.rpc("get_users_by_global_role", {
      p_role: "admin",
    });
    contacts = (data ?? []) as ContactRow[];
    contactRoleLabel = "admin";
  } else if (isCoordinatorOfThisParish) {
    const [eds, ads] = await Promise.all([
      supabase.rpc("get_users_by_global_role", { p_role: "editor" }),
      supabase.rpc("get_users_by_global_role", { p_role: "admin" }),
    ]);
    const all = [
      ...((eds.data ?? []) as ContactRow[]),
      ...((ads.data ?? []) as ContactRow[]),
    ];
    const seen = new Set<string>();
    contacts = all.filter((c) => {
      if (seen.has(c.user_id)) return false;
      seen.add(c.user_id);
      return true;
    });
    contactRoleLabel = "editor";
  } else {
    const { data } = await supabase.rpc("get_parish_coordinators", {
      p_parish_id: parish.id,
    });
    contacts = (data ?? []) as ContactRow[];
    contactRoleLabel = "coordinator";
    if (contacts.length === 0) {
      if (!user) {
        // Invitado sin coordinador: ocultar.
        contactRoleLabel = null;
      } else {
        // Member común sin coordinador: caer a editores.
        const { data: eds } = await supabase.rpc("get_users_by_global_role", {
          p_role: "editor",
        });
        contacts = (eds ?? []) as ContactRow[];
        contactRoleLabel = "editor";
      }
    }
  }


  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-secondary">
          Parroquia
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl text-page-title">{parish.name}</h1>
          {canEdit && (
            <Link
              href={`/admin/parroquias/${parish.id}`}
              className="rounded-full border border-primary px-4 py-2 text-sm font-semibold uppercase tracking-wide text-primary hover:bg-primary hover:text-primary-foreground"
            >
              Editar
            </Link>
          )}
        </div>
        {(parish.address || parish.city) && (
          <p className="text-sm normal-case text-muted-foreground">
            {[parish.address, parish.city].filter(Boolean).join(" · ")}
          </p>
        )}
        {parish.description && (
          <p className="max-w-2xl text-base normal-case text-muted-foreground">
            {parish.description}
          </p>
        )}
      </header>

      <section aria-labelledby="playlists-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="playlists-heading" className="text-xl">
            Listas
          </h2>
          {playlists.length > previewPlaylists.length && (
            <Link
              href={`/parroquias/${parish.slug}/playlists`}
              className="text-sm normal-case text-primary hover:underline"
            >
              Ver todas ({playlists.length})
            </Link>
          )}
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

      {parishAnnouncements.items.length > 0 && (
        <section
          aria-labelledby="anuncios-heading"
          className="flex flex-col gap-4"
        >
          <h2 id="anuncios-heading" className="text-xl">
            Anuncios
          </h2>
          <ul className="grid gap-3">
            {parishAnnouncements.items.map((item, i) => (
              <li key={i}>
                <AnnouncementCard item={item} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {contactRoleLabel !== null && (
        <section
          aria-labelledby="contacto-heading"
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1">
            <h2 id="contacto-heading" className="text-xl">
              Contacto
            </h2>
            <p className="text-sm normal-case text-muted-foreground">
              {contactRoleLabel === "coordinator" &&
                "Por cualquier sugerencia puede contactarse con el Coordinador Parroquial"}
              {contactRoleLabel === "editor" &&
                "Para cuestiones editoriales puede contactarse con un Editor o Administrador"}
              {contactRoleLabel === "admin" &&
                "Para cuestiones administrativas puede contactarse con un Administrador"}
            </p>
          </div>
          {contacts.length === 0 ? (
            <p className="rounded-xl border border-border bg-background p-6 text-base normal-case text-muted-foreground">
              No hay contactos disponibles.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {contacts.map((c) => {
                const name = c.display_name ?? c.email;
                const initial = name.charAt(0).toUpperCase();
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
                    <div className="flex min-w-0 flex-col gap-1">
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
              })}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
