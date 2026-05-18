import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AnuncioForm } from "@/app/(app)/admin/anuncios/anuncio-form";

export default async function NuevoAnuncioScopedPage({
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
  if (!user) redirect(`/parroquias/${slug}/anuncios`);

  const { data: parish } = await supabase
    .from("parishes")
    .select("id, slug, name")
    .eq("slug", slug)
    .eq("status", "active")
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
    redirect(`/parroquias/${slug}/anuncios`);
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-12">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-secondary">
          {parish.name}
        </p>
        <h1 className="text-2xl text-page-title">Nuevo aviso</h1>
      </header>

      <AnuncioForm
        mode="create"
        parishes={[parish]}
        allowGlobal={false}
        lockedParishIds={[parish.id]}
        restrictKinds={!isAdmin && !isEditor}
        hideDocumentOption={!isAdmin && !isEditor}
        backHref={`/parroquias/${slug}/anuncios`}
      />
    </main>
  );
}
