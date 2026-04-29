import Link from "next/link";

type Seccion = {
  href: string;
  titulo: string;
  descripcion: string;
};

const secciones: Seccion[] = [
  {
    href: "/admin/parroquias",
    titulo: "Parroquias",
    descripcion: "Alta, edición y baja de parroquias de la Arquidiócesis.",
  },
  {
    href: "/admin/anuncios",
    titulo: "Anuncios",
    descripcion: "Anuncios y novedades destacadas en la home, con destino global o multi-parroquia.",
  },
];

export default function AdminHomePage() {
  return (
    <main className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl">Administración</h1>
        <p className="mt-1 text-sm normal-case text-muted-foreground">
          Elegí la sección que querés gestionar.
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        {secciones.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="flex h-full flex-col gap-2 rounded-xl border border-border bg-background p-6 transition-colors hover:border-primary"
            >
              <span className="text-lg text-primary">{s.titulo}</span>
              <span className="text-sm leading-6 text-muted-foreground normal-case">
                {s.descripcion}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
