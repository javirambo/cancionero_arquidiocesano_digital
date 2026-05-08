import Link from "next/link";
import { getAdminAccess } from "./access";

type Seccion = {
  href: string;
  titulo: string;
  descripcion: string;
  show: (a: { isAdmin: boolean; isEditor: boolean; isAnyCoordinator: boolean }) => boolean;
};

const secciones: Seccion[] = [
  {
    href: "/admin/canciones",
    titulo: "Cantos",
    descripcion: "Edición de canciones: metadatos, letra/acordes y archivos asociados (partituras, audios).",
    show: (a) => a.isAdmin || a.isEditor,
  },
  {
    href: "/admin/playlists",
    titulo: "Listas generales",
    descripcion: "Repertorio arquidiocesano: alta, edición y baja de playlists visibles en todas las parroquias.",
    show: (a) => a.isAdmin || a.isEditor,
  },
  {
    href: "/admin/parroquias",
    titulo: "Parroquias",
    descripcion: "Alta, edición y baja de parroquias de la Arquidiócesis.",
    show: (a) => a.isAdmin,
  },
  {
    href: "/admin/anuncios",
    titulo: "Anuncios",
    descripcion: "Anuncios y novedades destacadas en la home, con destino global o multi-parroquia.",
    show: (a) => a.isAdmin || a.isEditor || a.isAnyCoordinator,
  },
  {
    href: "/admin/usuarios",
    titulo: "Usuarios",
    descripcion: "Asignación de roles globales y membresías por parroquia. El alta sigue siendo automática vía OAuth.",
    show: (a) => a.isAdmin,
  },
];

export default async function AdminHomePage() {
  const access = await getAdminAccess();
  const visibles = secciones.filter((s) => s.show(access));

  return (
    <main className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl">Administración</h1>
        <p className="mt-1 text-sm normal-case text-muted-foreground">
          Elegí la sección que querés gestionar.
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        {visibles.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="flex h-full items-center gap-4 rounded-xl border border-border bg-background p-6 transition-colors hover:border-primary"
            >
              <div className="flex flex-1 flex-col gap-2">
                <span className="text-lg text-primary">{s.titulo}</span>
                <span className="text-sm leading-6 text-muted-foreground normal-case">
                  {s.descripcion}
                </span>
              </div>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="shrink-0 text-primary"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
