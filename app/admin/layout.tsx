import Link from "next/link";
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

  // El sub-nav muestra solo las secciones que el usuario puede usar.
  const showAdminLinks = access.isAdmin;
  const showAnnouncements = access.isAdmin || access.isEditor || access.isAnyCoordinator;
  const showEditorLinks = access.isAdmin || access.isEditor;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
      <div className="flex flex-col gap-2 border-b border-border pb-3">
        <span className="text-sm uppercase tracking-[0.2em] text-secondary">
          Administración
        </span>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm normal-case">
          {showAdminLinks && (
            <Link href="/admin/parroquias" className="text-primary hover:underline">
              Parroquias
            </Link>
          )}
          {showAnnouncements && (
            <Link href="/admin/anuncios" className="text-primary hover:underline">
              Anuncios
            </Link>
          )}
          {showEditorLinks && (
            <Link href="/admin/canciones" className="text-primary hover:underline">
              Canciones
            </Link>
          )}
          {showEditorLinks && (
            <Link href="/admin/playlists" className="text-primary hover:underline">
              Playlists
            </Link>
          )}
          {showAdminLinks && (
            <Link href="/admin/usuarios" className="text-primary hover:underline">
              Usuarios
            </Link>
          )}
        </nav>
      </div>
      {children}
    </div>
  );
}
