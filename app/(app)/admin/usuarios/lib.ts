import { createClient } from "@/lib/supabase/server";

export type GlobalRole = "admin" | "editor";
export type ParishRole = "coordinator" | "member";

export type Membership = {
  parish_id: string;
  parish_slug: string;
  parish_name: string;
  role: ParishRole;
};

export type AdminUser = {
  id: string;
  email: string;
  display_name: string | null;
  is_active: boolean;
  global_roles: GlobalRole[];
  memberships: Membership[];
};

export type RolesById = { admin: string; editor: string };

export async function getRolesByName(): Promise<RolesById> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roles")
    .select("id, name")
    .in("name", ["admin", "editor"]);
  if (error) throw error;
  const byName = new Map((data ?? []).map((r) => [r.name as string, r.id as string]));
  const admin = byName.get("admin");
  const editor = byName.get("editor");
  if (!admin || !editor) {
    throw new Error("Roles 'admin' o 'editor' no están sembrados.");
  }
  return { admin, editor };
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const supabase = await createClient();

  const [usersRes, rolesRes, membersRes] = await Promise.all([
    supabase
      .from("users")
      .select("id, email, display_name, is_active")
      .order("display_name", { ascending: true, nullsFirst: false }),
    supabase.from("user_roles").select("user_id, roles(name)"),
    supabase
      .from("parish_members")
      .select("user_id, parish_id, role, parishes(id, slug, name)"),
  ]);
  if (usersRes.error) throw usersRes.error;
  if (rolesRes.error) throw rolesRes.error;
  if (membersRes.error) throw membersRes.error;

  type RoleRow = { user_id: string; roles: { name: string } | { name: string }[] | null };
  const rolesByUser = new Map<string, GlobalRole[]>();
  for (const r of (rolesRes.data ?? []) as RoleRow[]) {
    const rel = Array.isArray(r.roles) ? r.roles[0] : r.roles;
    const name = rel?.name as GlobalRole | undefined;
    if (!name || (name !== "admin" && name !== "editor")) continue;
    const arr = rolesByUser.get(r.user_id) ?? [];
    arr.push(name);
    rolesByUser.set(r.user_id, arr);
  }

  type ParishRel = { id: string; slug: string; name: string };
  type MemberRow = {
    user_id: string;
    parish_id: string;
    role: string;
    parishes: ParishRel | ParishRel[] | null;
  };
  const membershipsByUser = new Map<string, Membership[]>();
  for (const m of (membersRes.data ?? []) as MemberRow[]) {
    const rel = Array.isArray(m.parishes) ? m.parishes[0] : m.parishes;
    if (!rel) continue;
    const arr = membershipsByUser.get(m.user_id) ?? [];
    arr.push({
      parish_id: m.parish_id,
      parish_slug: rel.slug,
      parish_name: rel.name,
      role: m.role as ParishRole,
    });
    membershipsByUser.set(m.user_id, arr);
  }

  return (usersRes.data ?? []).map((u) => ({
    id: u.id as string,
    email: u.email as string,
    display_name: (u.display_name as string | null) ?? null,
    is_active: u.is_active as boolean,
    global_roles: rolesByUser.get(u.id as string) ?? [],
    memberships: (membershipsByUser.get(u.id as string) ?? []).sort((a, b) =>
      a.parish_name.localeCompare(b.parish_name, "es")
    ),
  }));
}

export async function listActiveParishesForAdmin(): Promise<
  { id: string; slug: string; name: string }[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parishes")
    .select("id, slug, name")
    .eq("status", "active")
    .order("name");
  if (error) throw error;
  return (data ?? []) as { id: string; slug: string; name: string }[];
}
