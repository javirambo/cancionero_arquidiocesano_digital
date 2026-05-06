import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlaylistForm, type ParishOption } from "@/app/(app)/playlists/playlist-form";

export default async function NuevaPlaylistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/perfil");

  // Roles globales del usuario.
  const { data: rolesRows } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", user.id);
  const roleNames = (rolesRows ?? [])
    .map((r) => {
      const rel = r.roles as { name: string } | { name: string }[] | null;
      const single = Array.isArray(rel) ? rel[0] : rel;
      return single?.name as string | undefined;
    })
    .filter((n): n is string => Boolean(n));
  const isAdmin = roleNames.includes("admin");
  const isEditor = isAdmin || roleNames.includes("editor");

  // Resolver contexto de creación según rol.
  // 1. admin / editor → parroquia virtual `arquidiocesis`.
  if (isEditor) {
    const { data: arch } = await supabase
      .from("parishes")
      .select("id, slug, name")
      .eq("slug", "arquidiocesis")
      .maybeSingle();
    if (!arch) {
      return (
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-6 py-12">
          <h1 className="text-2xl">Nueva playlist</h1>
          <p className="text-sm normal-case text-destructive">
            No se encontró la parroquia &quot;arquidiocesis&quot;. Contactá al
            administrador.
          </p>
        </main>
      );
    }
    return (
      <CreateLayout title="Nueva playlist arquidiocesana">
        <PlaylistForm
          mode="create"
          parishSlug={arch.slug as string}
          showArchdiocesan={true}
          initial={{
            parish_id: arch.id as string,
            name: "",
            description: "",
            schedules: [],
            visibility: "public",
            is_archdiocesan: true,
          }}
        />
      </CreateLayout>
    );
  }

  // 2. coordinator → parroquias donde es coordinator.
  const { data: members } = await supabase
    .from("parish_members")
    .select("parishes(id, slug, name), role")
    .eq("user_id", user.id)
    .eq("role", "coordinator");

  type Row = { id: string; slug: string; name: string };
  const coordParishes: Row[] = (members ?? [])
    .map((m) => {
      const rel = m.parishes as Row | Row[] | null;
      return Array.isArray(rel) ? rel[0] : rel;
    })
    .filter((p): p is Row => Boolean(p));

  if (coordParishes.length === 1) {
    const par = coordParishes[0];
    return (
      <CreateLayout title={`Nueva playlist en ${par.name}`}>
        <PlaylistForm
          mode="create"
          parishSlug={par.slug}
          showArchdiocesan={false}
          initial={{
            parish_id: par.id,
            name: "",
            description: "",
            schedules: [],
            visibility: "public",
            is_archdiocesan: false,
          }}
        />
      </CreateLayout>
    );
  }

  if (coordParishes.length > 1) {
    const options: ParishOption[] = coordParishes.map((p) => ({
      id: p.id,
      name: p.name,
    }));
    return (
      <CreateLayout title="Nueva playlist">
        <PlaylistForm
          mode="create"
          parishSlug={null}
          showArchdiocesan={false}
          parishOptions={options}
          initial={{
            parish_id: null,
            name: "",
            description: "",
            schedules: [],
            visibility: "public",
            is_archdiocesan: false,
          }}
        />
      </CreateLayout>
    );
  }

  // 3. member (sin coordinator ni editor) → playlist personal.
  return (
    <CreateLayout title="Nueva playlist personal">
      <PlaylistForm
        mode="create"
        parishSlug={null}
        showArchdiocesan={false}
        personalAllowed
        initial={{
          parish_id: null,
          name: "",
          description: "",
          schedules: [],
          visibility: "public",
          is_archdiocesan: false,
        }}
      />
    </CreateLayout>
  );
}

function CreateLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-8">
      <Link
        href="/playlists"
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
        Playlists
      </Link>
      <h1 className="text-2xl">{title}</h1>
      {children}
    </main>
  );
}
