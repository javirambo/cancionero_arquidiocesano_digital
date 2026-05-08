import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getAdminAccess } from "./access";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Administración · Cancionero Arquidiocesano",
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const access = await getAdminAccess();
  if (!access.userId) redirect("/perfil");

  // El acceso a `/admin/*` lo tienen admin, editor y cualquier
  // coordinator (que puede gestionar anuncios de sus parroquias).
  // Cada sub-página verifica permisos más específicos.
  const canAccess =
    access.isAdmin || access.isEditor || access.isAnyCoordinator;
  if (!canAccess) redirect("/perfil");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      {children}
    </div>
  );
}
