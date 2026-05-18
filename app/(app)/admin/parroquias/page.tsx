import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminAccess } from "../access";
import { AdminParishList, type AdminParishRow } from "./admin-parish-list";

export default async function AdminParroquiasPage() {
  const access = await getAdminAccess();
  if (!access.isAdmin && !access.isEditor) redirect("/admin");
  const supabase = await createClient();
  const { data: parishes } = await supabase
    .from("parishes")
    .select("id, name, slug, city, address, status")
    .neq("slug", "arquidiocesis")
    .order("name");

  const rows = (parishes ?? []) as AdminParishRow[];

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl text-page-title">Parroquias</h1>
          <Link
            href="/admin/parroquias/nueva"
            className="rounded-full border border-primary px-4 py-2 text-sm font-semibold uppercase tracking-wide text-primary hover:bg-primary hover:text-primary-foreground"
          >
            + Nueva
          </Link>
        </div>
        <p className="text-sm normal-case text-muted-foreground">
          Alta, edición y baja de parroquias de la Arquidiócesis.
        </p>
      </header>

      {rows.length > 0 ? (
        <AdminParishList rows={rows} />
      ) : (
        <p className="text-sm normal-case text-muted-foreground">
          No hay parroquias cargadas todavía.
        </p>
      )}
    </main>
  );
}
