import { redirect } from "next/navigation";
import { getAdminAccess } from "../../access";
import { ParroquiaForm } from "../parroquia-form";

export default async function NuevaParroquiaPage() {
  const access = await getAdminAccess();
  if (!access.isAdmin && !access.isEditor) redirect("/admin");
  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl text-page-title">Nueva parroquia</h1>
      </header>
      <ParroquiaForm mode="create" />
    </main>
  );
}
