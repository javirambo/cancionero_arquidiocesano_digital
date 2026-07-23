import { redirect } from "next/navigation";
import { getAdminAccess } from "@/app/(app)/admin/access";
import { SalmoForm } from "../salmo-form";

export const dynamic = "force-dynamic";

export default async function NuevoSalmoPage() {
  const access = await getAdminAccess();
  if (!access.isAdmin && !access.isEditor) redirect("/admin");

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-[0.2em] text-secondary">Nuevo salmo</span>
        <h1 className="text-2xl text-page-title">Nuevo salmo (manual)</h1>
        <p className="text-sm normal-case text-muted-foreground">
          Cargá a mano el audio y la partitura de un salmo que no está en el catálogo del Coro San
          Clemente. Después vinculalo a una fecha desde admin/lecturas.
        </p>
      </header>

      <SalmoForm mode="create" />
    </main>
  );
}
