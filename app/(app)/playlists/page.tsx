import { createClient } from "@/lib/supabase/server";
import {
  listArchdiocesanPlaylists,
  listMyPlaylistsSections,
  listPlaylistsByIds,
  type PlaylistSummary,
} from "@/lib/playlists";
import { loadSchedules } from "@/lib/schedule.server";
import { isVisibleNow } from "@/lib/schedule";
import { PlaylistCard } from "./playlist-card";
import { PlaylistListCard } from "./playlist-list-card";
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
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 pb-12 pt-4">
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

  // Listas favoritas del usuario (server): ids en la tabla `favorites`, luego
  // los detalles. Se ordenan por recencia de favoriteo.
  const { data: favRows } = await supabase
    .from("favorites")
    .select("target_id")
    .eq("user_id", user.id)
    .eq("target_kind", "playlist")
    .order("created_at", { ascending: false });
  const favIds = (favRows ?? []).map((r) => r.target_id as string);
  const favPlaylists = await listPlaylistsByIds(favIds);
  const favOrder = new Map(favIds.map((id, i) => [id, i]));
  favPlaylists.sort(
    (a, b) => (favOrder.get(a.id) ?? 0) - (favOrder.get(b.id) ?? 0)
  );

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
      label: `De parroquia ${p.name}`,
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

  // Editabilidad por lista: admin (cualquiera), dueño de una personal, o
  // coordinador de la parroquia dueña. (Sin created_by: las personales del
  // usuario se detectan por `myPersonalIds`.)
  const coordinatorParishIds = new Set(coordParishes.map((p) => p.id));
  const myPersonalIds = new Set(sections.personal.map((p) => p.id));
  const canEdit = (p: PlaylistSummary): boolean => {
    if (isAdmin) return true;
    if (myPersonalIds.has(p.id)) return true;
    if (p.parish && coordinatorParishIds.has(p.parish.id)) return true;
    return false;
  };

  // Grupos en orden, con dedupe acumulativo (un id que ya salió no se repite):
  // parroquias → arquidiócesis → favoritas → personales.
  const seen = new Set<string>();
  type Group = { key: string; label: string; items: PlaylistSummary[] };
  const groups: Group[] = [];
  const pushGroup = (key: string, label: string, source: PlaylistSummary[]) => {
    const items = source.filter((p) => !seen.has(p.id));
    items.forEach((p) => seen.add(p.id));
    if (items.length > 0) groups.push({ key, label, items });
  };
  for (const g of sections.byParish) {
    pushGroup(`parish-${g.parish.id}`, `DE ${g.parish.name}`, g.items);
  }
  pushGroup("arch", "DE LA ARQUIDIÓCESIS", sections.archdiocesan);
  pushGroup("fav", "MIS FAVORITAS", favPlaylists);
  pushGroup("personal", "PERSONALES", sections.personal);

  if (groups.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pb-12 pt-4">
        <header className="flex flex-col gap-2">
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

  // Vigencia actual de cada lista mostrada (para el chip "No activa hoy").
  const allIds = groups.flatMap((g) => g.items.map((p) => p.id));
  const sched = await loadSchedules("playlist", allIds);
  const isActiveNow = (id: string) => isVisibleNow(sched.get(id));

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 pb-12 pt-4">
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

      {groups.map((g) => (
        <section key={g.key} className="flex flex-col gap-3">
          <h2 className="text-xs uppercase tracking-[0.2em] text-secondary">
            {g.label}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {g.items.map((p) => (
              <PlaylistListCard
                key={p.id}
                playlist={{
                  id: p.id,
                  name: p.name,
                  description: p.description,
                  image_path: p.image_path,
                  parish: p.parish,
                }}
                inactive={!isActiveNow(p.id)}
                editable={canEdit(p)}
              />
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
