import { notFound, redirect } from "next/navigation";
import { getAdminAccess } from "@/app/(app)/admin/access";
import { getSalmo } from "@/lib/salmos-admin";
import { SalmoForm } from "../salmo-form";

export const dynamic = "force-dynamic";

export default async function EditarSalmoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const access = await getAdminAccess();
  if (!access.isAdmin && !access.isEditor) redirect("/admin");

  const { id } = await params;
  const salmo = await getSalmo(id);
  if (!salmo) notFound();

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-[0.2em] text-secondary">Editar salmo</span>
        <h1 className="text-2xl text-page-title">Sal {salmo.psalm_number}</h1>
        <p className="text-sm normal-case text-muted-foreground">{salmo.response}</p>
      </header>

      <SalmoForm mode="edit" salmo={salmo} />
    </main>
  );
}
