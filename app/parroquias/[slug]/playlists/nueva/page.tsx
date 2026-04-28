import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getParishBySlug } from "@/lib/songs";
import { createClient } from "@/lib/supabase/server";
import { PlaylistForm } from "@/app/playlists/playlist-form";

export default async function NuevaPlaylistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const parish = await getParishBySlug(slug);
  if (!parish) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/perfil");

  // Verificar permisos
  const { data: roles } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", user.id);
  const roleNames = (roles ?? [])
    .map((r) => {
      const rel = r.roles as { name: string } | { name: string }[] | null;
      const single = Array.isArray(rel) ? rel[0] : rel;
      return single?.name;
    })
    .filter((n): n is string => Boolean(n));
  const isAdmin = roleNames.includes("admin");

  let canCreate = isAdmin;
  if (!canCreate) {
    const { data: member } = await supabase
      .from("parish_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("parish_id", parish.id)
      .maybeSingle();
    canCreate = member?.role === "coordinator";
  }
  if (!canCreate) redirect(`/parroquias/${parish.slug}/playlists`);

  // Solo se puede marcar "arquidiocesana" si la playlist es de la parroquia
  // virtual "arquidiocesis" (y el usuario es admin o coord de ella).
  const showArchdiocesan = parish.slug === "arquidiocesis" && canCreate;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-8">
      <Link
        href={`/parroquias/${parish.slug}/playlists`}
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
      <h1 className="text-2xl">Nueva playlist en {parish.name}</h1>
      <PlaylistForm
        mode="create"
        parishSlug={parish.slug}
        showArchdiocesan={showArchdiocesan}
        initial={{
          parish_id: parish.id,
          name: "",
          description: "",
          event_date: "",
          visibility: "public",
          is_archdiocesan: false,
        }}
      />
    </main>
  );
}
