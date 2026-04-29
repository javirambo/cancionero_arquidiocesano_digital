import { createClient } from "@/lib/supabase/server";

export type ParishOption = { id: string; slug: string; name: string };

// Devuelve las parroquias seleccionables como destino de un anuncio:
// - nunca incluye la parroquia virtual `arquidiocesis`,
// - si el usuario es admin, todas las parroquias activas,
// - si no es admin, solo aquellas donde es miembro (parish_members).
export async function listScopedParishes(): Promise<ParishOption[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

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

  let query = supabase
    .from("parishes")
    .select("id, slug, name")
    .eq("is_active", true)
    .neq("slug", "arquidiocesis")
    .order("name");

  if (!isAdmin) {
    const { data: members } = await supabase
      .from("parish_members")
      .select("parish_id")
      .eq("user_id", user.id);
    const ids = (members ?? []).map((m) => m.parish_id as string);
    if (ids.length === 0) return [];
    query = query.in("id", ids);
  }

  const { data } = await query;
  return (data ?? []) as ParishOption[];
}
