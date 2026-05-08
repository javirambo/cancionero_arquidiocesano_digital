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
  const [coordinatorsRes, adminEmailsRes] = await Promise.all([
    supabase.rpc("get_parish_coordinators", { p_parish_id: parish.id }),
    supabase
      .from("settings")
      .select("value")
      .eq("key", "admin_contact_emails")
      .maybeSingle(),
  ]);
  const coordinators = (coordinatorsRes.data ?? []) as Array<{
    user_id: string;
    display_name: string | null;
    email: string;
    avatar_url: string | null;
  }>;
  const adminContactEmails: string[] = Array.isArray(adminEmailsRes.data?.value)
    ? (adminEmailsRes.data?.value as string[])
    : [];

  // Anuncios solo si el usuario es miembro de esta parroquia.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let parishAnnouncements: Awaited<
    ReturnType<typeof listAnnouncementsForParish>
  > = { items: [], total: 0 };
  let canEdit = false;
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
    }
    const roleNames =
      (rolesRes.data ?? [])
        .map((r: { roles: { name: string } | { name: string }[] | null }) => {
          const roles = r.roles;
          if (Array.isArray(roles)) return roles[0]?.name;
          return roles?.name;
        })
        .filter(Boolean) as string[];
    const isAdmin = roleNames.includes("admin");
    canEdit = isAdmin || memberRes.data?.role === "coordinator";
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-12">
      <Link
        href="/parroquias"
        className="flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-secondary hover:underline"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Volver a parroquias
      </Link>
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-secondary">
          Parroquia
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl">{parish.name}</h1>
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
          <p className="rounded-xl border border-border bg-sidebar p-6 text-base normal-case text-muted-foreground">
            Esta parroquia todavía no publicó playlists.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {previewPlaylists.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/playlists/${p.id}`}
                  className="flex h-full flex-col gap-2 rounded-xl border border-border bg-background p-5 transition-colors hover:border-primary"
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

      <section aria-labelledby="contacto-heading" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="contacto-heading" className="text-xl">
            Contacto
          </h2>
          <p className="text-sm normal-case text-muted-foreground">
            Por cualquier sugerencia puede contactarse con el Coordinador Parroquial
          </p>
        </div>
        {coordinators.length === 0 ? (
          <p className="rounded-xl border border-border bg-sidebar p-6 text-base normal-case text-muted-foreground">
            Esta parroquia todavía no tiene un administrador parroquial asignado.
            {adminContactEmails.length > 0 && (
              <>
                {" "}
                Puede contactarse con{" "}
                {adminContactEmails.map((email, i) => (
                  <span key={email}>
                    {i > 0 && (i === adminContactEmails.length - 1 ? " o " : ", ")}
                    <a
                      href={`mailto:${email}`}
                      className="text-primary hover:underline"
                    >
                      {email}
                    </a>
                  </span>
                ))}{" "}
                para solicitarlo.
              </>
            )}
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {coordinators.map((c) => {
              const name = c.display_name ?? c.email;
              const initial = name.charAt(0).toUpperCase();
              return (
                <li
                  key={c.user_id}
                  className="flex items-center gap-4 rounded-xl border border-border bg-background p-5"
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
    </main>
  );
}
