import { notFound, redirect } from "next/navigation";
import { getAdminAccess } from "@/app/(app)/admin/access";
import { getReadingRowsForDate, listSalmosMini } from "@/lib/lecturas-admin";
import { getLiturgicalDay } from "@/lib/liturgical";
import { LecturasForm } from "./lecturas-form";

export const dynamic = "force-dynamic";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function formatFecha(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${y}`;
}

export default async function EditarLecturaPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const access = await getAdminAccess();
  if (!access.isAdmin && !access.isEditor) redirect("/admin");

  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const [rows, romcal, salmos] = await Promise.all([
    getReadingRowsForDate(date),
    getLiturgicalDay(date),
    listSalmosMini(),
  ]);

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-[0.2em] text-secondary">
          Editar lecturas
        </span>
        <h1 className="text-2xl text-page-title">{formatFecha(date)}</h1>
        {romcal && (
          <p className="text-sm normal-case text-muted-foreground">
            Calendario (romcal): <strong>{romcal.name}</strong>
            {romcal.color ? ` · ${romcal.color}` : ""} · {romcal.seasonName}
          </p>
        )}
      </header>

      <LecturasForm
        date={date}
        rows={rows}
        salmos={salmos}
        romcal={
          romcal
            ? { name: romcal.name, color: romcal.color, seasonName: romcal.seasonName }
            : null
        }
      />
    </main>
  );
}
