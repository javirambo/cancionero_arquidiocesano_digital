import { createClient } from "@/lib/supabase/server";

export type AdminAccess = {
  userId: string | null;
  isAdmin: boolean;
  isEditor: boolean;
  /** Es coordinator de al menos una parroquia. */
  isAnyCoordinator: boolean;
};

export async function getAdminAccess(): Promise<AdminAccess> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      userId: null,
      isAdmin: false,
      isEditor: false,
      isAnyCoordinator: false,
    };
  }

  const [rolesRes, membersRes] = await Promise.all([
    supabase.from("user_roles").select("roles(name)").eq("user_id", user.id),
    supabase
      .from("parish_members")
      .select("parish_id")
      .eq("user_id", user.id)
      .eq("role", "coordinator")
      .limit(1),
  ]);

  const roleNames = (rolesRes.data ?? [])
    .map((r) => {
      const rel = r.roles as { name: string } | { name: string }[] | null;
      const single = Array.isArray(rel) ? rel[0] : rel;
      return single?.name;
    })
    .filter((n): n is string => Boolean(n));

  return {
    userId: user.id,
    isAdmin: roleNames.includes("admin"),
    isEditor: roleNames.includes("editor"),
    isAnyCoordinator: (membersRes.data ?? []).length > 0,
  };
}
