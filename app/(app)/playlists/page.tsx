import { createClient } from "@/lib/supabase/server";
import {
  listArchdiocesanPlaylists,
  listMyPlaylistsSections,
} from "@/lib/playlists";
import { PlaylistCard } from "./playlist-card";
import {
  NewPlaylistButton,
  type NewPlaylistOption,
} from "./new-playlist-button";

export const metadata = {
  title: "Playlists · Cancionero Arquidiocesano",
};

export default async function PlaylistsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const archdiocesan = await listArchdiocesanPlaylists();
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-12">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl text-page-title">Mis listas</h1>
          <p className="text-base italic normal-case text-muted-foreground">
            Estás navegando como invitado. Iniciá sesión para guardar tus
            favoritos en la nube, vincular tu parroquia y acceder a tus listas.
          </p>
          <p className="text-base normal-case text-muted-foreground">
            Listas de cantos arquidiocesanos.
          </p>
        </header>

        {archdiocesan.length > 0 ? (
          <section className="flex flex-col gap-3">
            <ul className="grid gap-3 sm:grid-cols-2">
              {archdiocesan.map((p) => (
                <PlaylistCard
                  key={p.id}
                  playlist={{
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    image_path: p.image_path,
                    parish: p.parish,
                  }}
                  badge="De la Arquidiócesis"
                />
              ))}
            </ul>
          </section>
        ) : (
          <section className="rounded-2xl border border-border bg-background p-6">
            <p className="text-sm normal-case text-muted-foreground">
              Todavía no hay playlists arquidiocesanas disponibles.
            </p>
          </section>
        )}
      </main>
    );
  }

  const sections = await listMyPlaylistsSections(user.id, {
    includeOutOfWindow: true,
  });
  const isEmpty =
    sections.personal.length === 0 &&
    sections.byParish.length === 0 &&
    sections.archdiocesan.length === 0;

  // Opciones del botón "+ Nueva".
  const [profileRes, rolesRes, coordRes] = await Promise.all([
    supabase
      .from("users")
      .select("display_name, email")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("user_roles").select("roles(name)").eq("user_id", user.id),
    supabase
      .from("parish_members")
      .select("parishes(id, name)")
      .eq("user_id", user.id)
      .eq("role", "coordinator"),
  ]);
  const displayName =
    (profileRes.data?.display_name as string | null) ||
    (profileRes.data?.email as string | null) ||
    "Personal";
  const roleNames = (rolesRes.data ?? [])
    .map((r) => {
      const rel = r.roles as { name: string } | { name: string }[] | null;
      const single = Array.isArray(rel) ? rel[0] : rel;
      return single?.name as string | undefined;
    })
    .filter((n): n is string => Boolean(n));
  const isAdmin = roleNames.includes("admin");
  const isEditor = isAdmin || roleNames.includes("editor");
  type ParishLite = { id: string; name: string };
  const coordParishes: ParishLite[] = (coordRes.data ?? [])
    .map((m) => {
      const rel = m.parishes as ParishLite | ParishLite[] | null;
      return Array.isArray(rel) ? rel[0] : rel;
    })
    .filter((p): p is ParishLite => Boolean(p));
  const newOptions: NewPlaylistOption[] = [
    { kind: "personal", label: `Personal de ${displayName}` },
    ...coordParishes.map<NewPlaylistOption>((p) => ({
      kind: "parish",
      parishId: p.id,
      label: `De ${p.name}`,
    })),
    ...(isEditor
      ? [
          {
            kind: "archdiocesan" as const,
            label: "Pública Arquidiocesana",
          },
        ]
      : []),
  ];

  if (isEmpty) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12">
        <header className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-secondary">
            Playlists
          </p>
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-3xl text-page-title">Mis listas</h1>
            <NewPlaylistButton options={newOptions} />
          </div>
        </header>
        <section className="rounded-2xl border border-border bg-background p-6">
          <p className="text-sm normal-case text-muted-foreground">
            Todavía no tenés listas. Vinculá tu parroquia o creá una lista
            personal desde el menú &quot;…&quot; de cualquier canto.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl text-page-title">Mis listas</h1>
          <NewPlaylistButton options={newOptions} />
        </div>
        <p className="text-base normal-case text-muted-foreground">
          Tus repertorios personales, los de tus parroquias y los de la
          Arquidiócesis.
        </p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2">
        {sections.personal.map((p) => (
          <PlaylistCard
            key={p.id}
            playlist={{
              id: p.id,
              name: p.name,
              description: p.description,
              image_path: p.image_path,
              parish: p.parish,
            }}
            badge="Personal"
          />
        ))}
        {sections.byParish.flatMap((g) =>
          g.items.map((p) => (
            <PlaylistCard
              key={p.id}
              playlist={{
                id: p.id,
                name: p.name,
                description: p.description,
                parish: p.parish,
              }}
              badge={
                p.relation === "subscribed" && p.parish
                  ? `Compartida por ${p.parish.name}`
                  : null
              }
            />
          ))
        )}
        {sections.archdiocesan.map((p) => (
          <PlaylistCard
            key={p.id}
            playlist={{
              id: p.id,
              name: p.name,
              description: p.description,
              image_path: p.image_path,
              parish: p.parish,
            }}
            badge="De la Arquidiócesis"
          />
        ))}
      </ul>
    </main>
  );
}
