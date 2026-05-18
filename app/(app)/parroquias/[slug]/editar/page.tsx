import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ParroquiaForm } from "@/app/(app)/admin/parroquias/parroquia-form";

export default async function EditarParroquiaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "arquidiocesis") notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/parroquias/${slug}`);

  const { data: parish } = await supabase
    .from("parishes")
    .select(
      "id, name, slug, address, city, phone, email, description, status, logo_url, decanato, parent_id, latitude, longitude, url"
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!parish) notFound();

  const [rolesRes, memberRes] = await Promise.all([
    supabase.from("user_roles").select("roles(name)").eq("user_id", user.id),
    supabase
      .from("parish_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("parish_id", parish.id)
      .maybeSingle(),
  ]);
  const roleNames = (rolesRes.data ?? [])
    .map((r) => {
      const rel = r.roles as { name: string } | { name: string }[] | null;
      const single = Array.isArray(rel) ? rel[0] : rel;
      return single?.name;
    })
    .filter((n): n is string => Boolean(n));
  const isAdmin = roleNames.includes("admin");
  const isEditor = roleNames.includes("editor");
  const isCoordinator = memberRes.data?.role === "coordinator";
  if (!isAdmin && !isEditor && !isCoordinator) {
    redirect(`/parroquias/${slug}`);
  }
  const restricted = !isAdmin && !isEditor;

  const { data: parishesRaw } = await supabase
    .from("parishes")
    .select("id, name, decanato")
    .eq("status", "active")
    .is("parent_id", null)
    .neq("id", parish.id)
    .neq("slug", "arquidiocesis")
    .order("name", { ascending: true });
  const parishes = (parishesRaw ?? []) as Array<{
    id: string;
    name: string;
    decanato: string | null;
  }>;

  const { data: decanatosRaw } = await supabase
    .from("parishes")
    .select("decanato")
    .neq("slug", "arquidiocesis")
    .not("decanato", "is", null);
  const decanatos = Array.from(
    new Set(
      ((decanatosRaw ?? []) as Array<{ decanato: string | null }>)
        .map((r) => r.decanato?.trim())
        .filter((d): d is string => Boolean(d))
    )
  ).sort((a, b) => a.localeCompare(b, "es"));

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-12">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-secondary">
          Editar parroquia
        </p>
        <h1 className="text-2xl text-page-title">{parish.name}</h1>
      </header>
      <ParroquiaForm
        mode="edit"
        parishes={parishes}
        decanatos={decanatos}
        restricted={restricted}
        backHref={`/parroquias/${slug}`}
        initial={{
          id: parish.id,
          name: parish.name,
          slug: parish.slug,
          address: parish.address ?? "",
          city: parish.city ?? "",
          phone: parish.phone ?? "",
          email: parish.email ?? "",
          description: parish.description ?? "",
          status: parish.status,
          logo_url: parish.logo_url ?? "",
          decanato: parish.decanato ?? "",
          parent_id: parish.parent_id ?? "",
          latitude: parish.latitude !== null ? String(parish.latitude) : "",
          longitude: parish.longitude !== null ? String(parish.longitude) : "",
          url: parish.url ?? "",
        }}
      />
    </main>
  );
}
