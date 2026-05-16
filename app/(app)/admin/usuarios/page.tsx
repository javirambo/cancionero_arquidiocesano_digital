import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminAccess } from "../access";
import {
  getRolesByName,
  listActiveParishesForAdmin,
  listAdminUsers,
} from "./lib";
import { UsersTable } from "./users-table";

export default async function AdminUsuariosPage() {
  const access = await getAdminAccess();
  if (!access.isAdmin) redirect("/admin");
  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const [users, parishes, rolesByName] = await Promise.all([
    listAdminUsers(),
    listActiveParishesForAdmin(),
    getRolesByName(),
  ]);

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl text-page-title">Usuarios</h1>
        <p className="text-sm normal-case text-muted-foreground">
          Asignación de roles globales y membresías por parroquia. El alta de
          usuarios sigue siendo automática vía OAuth.
        </p>
      </header>
      <UsersTable
        initialUsers={users}
        parishes={parishes}
        adminRoleId={rolesByName.admin}
        editorRoleId={rolesByName.editor}
        currentUserId={currentUser?.id ?? null}
      />
    </main>
  );
}
