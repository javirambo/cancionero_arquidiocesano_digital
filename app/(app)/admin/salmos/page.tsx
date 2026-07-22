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
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl text-page-title">Salmos</h1>
        <p className="text-sm normal-case text-muted-foreground">
          Audio cantado y partitura de cada salmo responsorial. Se editan una vez y se reflejan en
          todas las fechas que usan ese salmo.
        </p>
      </header>

      <SalmosList salmos={salmos} />
    </main>
  );
}
