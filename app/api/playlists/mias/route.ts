import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type AddablePlaylist = { id: string; name: string };
export type AddablePlaylistGroup = { label: string; items: AddablePlaylist[] };

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "no-session" }, { status: 401 });
  }

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

  const { data: members } = await supabase
    .from("parish_members")
    .select("parish_id, role, parishes(id, slug, name)")
    .eq("user_id", user.id);

  type ParishRow = { id: string; slug: string; name: string };
  const memberParishes = (members ?? [])
    .map((m) => {
      const rel = m.parishes as ParishRow | ParishRow[] | null;
      const par = Array.isArray(rel) ? rel[0] : rel;
      return par ? { ...par, role: m.role as string } : null;
    })
    .filter((p): p is ParishRow & { role: string } => Boolean(p));

  const coordinatorParishIds = new Set(
    memberParishes.filter((p) => p.role === "coordinator").map((p) => p.id)
  );

  const writableParishIds: string[] = isEditor
    ? memberParishes.map((p) => p.id)
    : memberParishes
        .filter((p) => coordinatorParishIds.has(p.id))
        .map((p) => p.id);

  const groups: AddablePlaylistGroup[] = [];

  // 1. Personales del usuario (todos los roles).
  const { data: personalRows } = await supabase
    .from("playlists")
    .select("id, name")
    .is("parish_id", null)
    .eq("created_by", user.id)
    .order("name", { ascending: true });
  if ((personalRows ?? []).length > 0) {
    groups.push({
      label: "Mis playlists personales",
      items: (personalRows ?? []).map((p) => ({
        id: p.id as string,
        name: p.name as string,
      })),
    });
  }

  // 2. Por cada parroquia donde puede escribir.
  if (writableParishIds.length > 0) {
    const { data: parishRows } = await supabase
      .from("playlists")
      .select("id, name, parish_id")
      .in("parish_id", writableParishIds)
      .order("name", { ascending: true });
    const byParish = new Map<string, AddablePlaylist[]>();
    for (const row of parishRows ?? []) {
      const pid = row.parish_id as string;
      if (!byParish.has(pid)) byParish.set(pid, []);
      byParish.get(pid)!.push({ id: row.id as string, name: row.name as string });
    }
    for (const par of memberParishes) {
      if (!writableParishIds.includes(par.id)) continue;
      const items = byParish.get(par.id) ?? [];
      if (items.length === 0) continue;
      groups.push({ label: par.name, items });
    }
  }

  // 3. Arquidiocesanas (solo admin/editor).
  if (isEditor) {
    const { data: archRows } = await supabase
      .from("playlists")
      .select("id, name")
      .eq("is_archdiocesan", true)
      .order("name", { ascending: true });
    if ((archRows ?? []).length > 0) {
      groups.push({
        label: "Arquidiócesis",
        items: (archRows ?? []).map((p) => ({
          id: p.id as string,
          name: p.name as string,
        })),
      });
    }
  }

  return NextResponse.json({ groups });
}
