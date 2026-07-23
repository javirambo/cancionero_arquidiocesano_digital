import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminAccess } from "../access";
import { listSalmos } from "@/lib/salmos-admin";
import { SalmosList } from "./salmos-list";

export const dynamic = "force-dynamic";

export default async function AdminSalmosPage() {
  const access = await getAdminAccess();
  if (!access.isAdmin && !access.isEditor) redirect("/admin");

  const salmos = await listSalmos();

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl text-page-title">Salmos</h1>
          <Link
            href="/admin/salmos/nuevo"
            className="shrink-0 rounded-full border border-primary bg-primary px-5 py-2 text-sm font-semibold uppercase tracking-wide text-primary-foreground hover:opacity-90"
          >
            + Nuevo salmo
          </Link>
        </div>
        <p className="text-sm normal-case text-muted-foreground">
          Audio cantado y partitura de cada salmo responsorial. Se editan una vez y se reflejan en
          todas las fechas que usan ese salmo.
        </p>
        <p className="text-xs normal-case text-muted-foreground">
          <b>Nuevo salmo</b> crea una entrada manual para cargar audio/partitura cuando el salmo no
          está en el catálogo del Coro San Clemente.
        </p>
      </header>

      <SalmosList salmos={salmos} />
    </main>
  );
}
