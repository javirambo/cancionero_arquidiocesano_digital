import { redirect } from "next/navigation";
import { AnuncioForm } from "../anuncio-form";
import { listScopedParishes } from "../scoped-parishes";
import { getAdminAccess } from "../../access";

export default async function NuevoAnuncioPage() {
  const access = await getAdminAccess();
  if (!access.isAdmin && !access.isEditor) redirect("/admin");
  const parishes = await listScopedParishes();
  const allowGlobal = true;

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl text-page-title">Nuevo anuncio</h1>
      </header>

      <AnuncioForm mode="create" parishes={parishes} allowGlobal={allowGlobal} />
    </main>
  );
}
