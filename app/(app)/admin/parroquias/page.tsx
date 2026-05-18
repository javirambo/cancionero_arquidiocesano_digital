import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminAccess } from "../access";

export default async function AdminParroquiasPage() {
  const access = await getAdminAccess();
  if (!access.isAdmin && !access.isEditor) redirect("/admin");
  const supabase = await createClient();
  const { data: parishes } = await supabase
    .from("parishes")
    .select("id, name, slug, city, address, status")
    .neq("slug", "arquidiocesis")
    .order("name");

  const rows = parishes ?? [];

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
        <section className="flex flex-col gap-3">
          <ul className="divide-y divide-border rounded-xl border border-border">
            {rows.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-sidebar"
              >
                <Link
                  href={`/admin/parroquias/${p.id}`}
                  className="flex flex-1 flex-col gap-0.5"
                >
                  <span className="text-base text-primary">{p.name}</span>
                  <span className="text-xs normal-case text-muted-foreground">
                    {p.city ?? "—"}
                    {p.status === "inactive" && " · inactiva"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-sm normal-case text-muted-foreground">
          No hay parroquias cargadas todavía.
        </p>
      )}
    </main>
  );
}
