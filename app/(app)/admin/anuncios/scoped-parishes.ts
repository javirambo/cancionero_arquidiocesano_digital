import { createClient } from "@/lib/supabase/server";

export type ParishOption = {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
};

// Devuelve las parroquias seleccionables como destino de un anuncio:
// - nunca incluye la parroquia virtual `arquidiocesis`,
// - si el usuario es admin o editor, todas las parroquias no inactivas,
// - si es coordinator/member, solo aquellas donde es miembro (parish_members).
// El orden es parroquias primero y capillas después, alfabético dentro de
// cada grupo.
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
  const isEditor = isAdmin || roleNames.includes("editor");

  let query = supabase
    .from("parishes")
    .select("id, slug, name, parent_id")
    .neq("status", "inactive")
    .neq("slug", "arquidiocesis")
    .order("name");

  if (!isEditor) {
    const { data: members } = await supabase
      .from("parish_members")
      .select("parish_id")
      .eq("user_id", user.id);
    const ids = (members ?? []).map((m) => m.parish_id as string);
    if (ids.length === 0) return [];
    query = query.in("id", ids);
  }

  const { data } = await query;
  const options = (data ?? []) as ParishOption[];
  return [
    ...options.filter((p) => !p.parent_id),
    ...options.filter((p) => p.parent_id),
  ];
}
