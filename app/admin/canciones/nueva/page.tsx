import { redirect } from "next/navigation";
import { getAdminAccess } from "@/app/admin/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NuevaCancionPage() {
  const access = await getAdminAccess();
  if (!access.isAdmin && !access.isEditor) redirect("/admin");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin");

  const slug = `nueva-cancion-${Date.now()}`;
  const { data, error } = await supabase
    .from("songs")
    .insert({
      title: "Nueva canción",
      slug,
      body: "",
      status: "draft",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(
      `/admin/canciones?error=${encodeURIComponent(
        error?.message ?? "No se pudo crear la canción"
      )}`
    );
  }

  redirect(`/admin/canciones/${data.id}/editar`);
}
