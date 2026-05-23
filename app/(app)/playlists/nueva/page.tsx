import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlaylistForm, type ParishOption } from "@/app/(app)/playlists/playlist-form";

export default async function NuevaPlaylistPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; parish?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

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

  // 1a. Scope explícito por query param.
  if (sp.scope === "personal") {
    return (
      <CreateLayout title="Nueva lista personal">
        <PlaylistForm
          mode="create"
          parishSlug={null}
          personalAllowed
          restricted
          initial={{
            parish_id: null,
            name: "",
            description: "",
            image_path: null,
            schedules: [],
            visibility: "unlisted",
            is_archdiocesan: false,
          }}
        />
      </CreateLayout>
    );
  }

  if (sp.scope === "parish" && sp.parish) {
    // Verificar que el user es coordinator (o admin) de esa parroquia.
    const [parishRes, memberRes] = await Promise.all([
      supabase
        .from("parishes")
        .select("id, slug, name")
        .eq("id", sp.parish)
        .maybeSingle(),
      supabase
        .from("parish_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("parish_id", sp.parish)
        .maybeSingle(),
    ]);
    const allowed =
      isAdmin || memberRes.data?.role === "coordinator";
    if (parishRes.data && allowed) {
      const par = parishRes.data as { id: string; slug: string; name: string };
      return (
        <CreateLayout title={`Nueva lista en ${par.name}`}>
          <PlaylistForm
            mode="create"
            parishSlug={par.slug}
              initial={{
              parish_id: par.id,
              name: "",
              description: "",
              image_path: null,
              schedules: [],
              visibility: "public",
              is_archdiocesan: false,
            }}
          />
        </CreateLayout>
      );
    }
    redirect("/playlists");
  }

  if (sp.scope === "archdiocesan" && isEditor) {
    const { data: arch } = await supabase
      .from("parishes")
      .select("id, slug, name")
      .eq("slug", "arquidiocesis")
      .maybeSingle();
    if (arch) {
      return (
        <CreateLayout title="Nueva lista arquidiocesana">
          <PlaylistForm
            mode="create"
            parishSlug={arch.slug as string}
              initial={{
              parish_id: arch.id as string,
              name: "",
              description: "",
              image_path: null,
              schedules: [],
              visibility: "public",
              is_archdiocesan: true,
            }}
          />
        </CreateLayout>
      );
    }
  }

  // Fallback: resolver contexto de creación según rol.
  // 1. admin / editor → parroquia virtual `arquidiocesis`.
  if (isEditor) {
    const { data: arch } = await supabase
      .from("parishes")
      .select("id, slug, name")
      .eq("slug", "arquidiocesis")
      .maybeSingle();
    if (!arch) {
      return (
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-12">
          <h1 className="text-2xl text-page-title">Nueva lista</h1>
          <p className="text-sm normal-case text-destructive">
            No se encontró la parroquia &quot;arquidiocesis&quot;. Contactá al
            administrador.
          </p>
        </main>
      );
    }
    return (
      <CreateLayout title="Nueva lista arquidiocesana">
        <PlaylistForm
          mode="create"
          parishSlug={arch.slug as string}
          initial={{
            parish_id: arch.id as string,
            name: "",
            description: "",
            image_path: null,
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
      <CreateLayout title={`Nueva lista en ${par.name}`}>
        <PlaylistForm
          mode="create"
          parishSlug={par.slug}
          initial={{
            parish_id: par.id,
            name: "",
            description: "",
            image_path: null,
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
      <CreateLayout title="Nueva lista">
        <PlaylistForm
          mode="create"
          parishSlug={null}
          parishOptions={options}
          initial={{
            parish_id: null,
            name: "",
            description: "",
            image_path: null,
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
    <CreateLayout title="Nueva lista personal">
      <PlaylistForm
        mode="create"
        parishSlug={null}
        personalAllowed
        restricted
        initial={{
          parish_id: null,
          name: "",
          description: "",
          image_path: null,
          schedules: [],
          visibility: "unlisted",
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
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl text-page-title">{title}</h1>
      {children}
    </main>
  );
}
