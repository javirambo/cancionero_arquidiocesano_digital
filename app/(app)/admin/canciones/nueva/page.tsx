import { redirect } from "next/navigation";
import { getAdminAccess } from "@/app/(app)/admin/access";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NuevaCancionPage() {
  const access = await getAdminAccess();
  if (!access.isAdmin && !access.isEditor) redirect("/admin");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_blank_song", {
    p_title: "Nuevo canto",
  });

  if (error) {
    throw new Error(`create_blank_song falló: ${error.message}`);
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || !row.id) {
    throw new Error(
      `create_blank_song no devolvió fila. data=${JSON.stringify(data)}`
    );
  }

  redirect(`/admin/canciones/${row.id}/editar`);
}
