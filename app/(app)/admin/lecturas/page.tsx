import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminAccess } from "../access";
import { getMesLiturgico, type DiaLiturgico } from "@/lib/calendario";

export const dynamic = "force-dynamic";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

// Colores litúrgicos reales (dato, no tema de la app) para el punto de color.
const COLOR_HEX: Record<string, string> = {
  verde: "#2e7d32",
  rojo: "#c62828",
  blanco: "#f5f5f5",
  morado: "#6a1b9a",
  rosa: "#ec8fb5",
  negro: "#222222",
};

function parseMes(mes: string | undefined): { year: number; month: number } {
  const m = mes?.match(/^(\d{4})-(\d{2})$/);
  if (m) return { year: Number(m[1]), month: Number(m[2]) };
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function shiftMes(year: number, month: number, delta: number): string {
  const idx = (year * 12 + (month - 1)) + delta;
  const y = Math.floor(idx / 12);
  const mo = (idx % 12) + 1;
  return `${y}-${String(mo).padStart(2, "0")}`;
}

function weekday(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  return DIAS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export default async function AdminLecturasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const access = await getAdminAccess();
  if (!access.isAdmin && !access.isEditor) redirect("/admin");

  const { mes } = await searchParams;
  const { year, month } = parseMes(mes);
  const dias = await getMesLiturgico(year, month);

  const prev = shiftMes(year, month, -1);
  const next = shiftMes(year, month, 1);

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl text-page-title">Lecturas Litúrgicas</h1>
        <p className="text-sm normal-case text-muted-foreground">
          Calendario y leccionario del día. El calendario base lo da romcal; las lecturas se
          importan de curas.com.ar. Editá o completá lo que falte — tus cambios quedan bloqueados
          y la actualización anual no los pisa.
        </p>
      </header>

      <nav className="flex items-center justify-between gap-4">
        <Link
          href={`/admin/lecturas?mes=${prev}`}
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold uppercase tracking-wide text-foreground hover:border-primary hover:text-primary"
        >
          ← {MESES[(month + 10) % 12]}
        </Link>
        <span className="text-lg text-page-title">
          {MESES[month - 1]} {year}
        </span>
        <Link
          href={`/admin/lecturas?mes=${next}`}
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold uppercase tracking-wide text-foreground hover:border-primary hover:text-primary"
        >
          {MESES[month % 12]} →
        </Link>
      </nav>

      <ul className="flex flex-col gap-2">
        {dias.map((dia) => (
          <li key={dia.fecha}>
            <DiaRow dia={dia} />
          </li>
        ))}
      </ul>

      <ScriptBox year={year} />
    </main>
  );
}

// ¿El salmo del día (principal o memoria) tiene audio y/o partitura?
function psalmFiles(dia: DiaLiturgico): { hasAudio: boolean; hasScore: boolean } {
  const files = [
    ...(dia.lecturas.principal?.psalm?.files ?? []),
    ...(dia.lecturas.memoria?.psalm?.files ?? []),
  ];
  return {
    hasAudio: files.some((f) => f.kind.startsWith("audio_")),
    hasScore: files.some((f) => f.kind.startsWith("score_")),
  };
}

function AudioIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    </svg>
  );
}

function ScoreIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </svg>
  );
}

function DiaRow({ dia }: { dia: DiaLiturgico }) {
  const day = Number(dia.fecha.slice(8, 10));
  const hex = dia.color ? COLOR_HEX[dia.color] : null;
  const { hasAudio, hasScore } = psalmFiles(dia);
  return (
    <Link
      href={`/admin/lecturas/${dia.fecha}`}
      className="flex gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary"
    >
      <div className="flex w-12 shrink-0 flex-col items-center">
        <span className="text-lg text-page-title">{day}</span>
        <span className="text-xs uppercase text-muted-foreground">{weekday(dia.fecha)}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-start gap-2 text-sm text-foreground normal-case">
          {hex && (
            <span
              aria-hidden="true"
              className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full border border-border"
              style={{ backgroundColor: hex }}
            />
          )}
          <span className="min-w-0">{dia.nombre || "—"}</span>
        </span>
        {dia.tiempo && (
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {dia.tiempo}
          </span>
        )}
        <div className="mt-1 flex items-center justify-end gap-2">
          {hasAudio && (
            <span
              className="shrink-0 text-primary"
              title="Tiene audio del salmo"
              aria-label="Tiene audio del salmo"
            >
              <AudioIcon />
            </span>
          )}
          {hasScore && (
            <span
              className="shrink-0 text-primary"
              title="Tiene partitura del salmo"
              aria-label="Tiene partitura del salmo"
            >
              <ScoreIcon />
            </span>
          )}
          {dia.lecturas.memoria && (
            <span className="shrink-0 rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary">
              + memoria
            </span>
          )}
          <EstadoBadge dia={dia} />
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="shrink-0 text-muted-foreground"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

function EstadoBadge({ dia }: { dia: DiaLiturgico }) {
  if (dia.fuente === "manual") {
    return (
      <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">
        Bloqueada
      </span>
    );
  }
  if (dia.lecturas.principal) {
    return (
      <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success">
        Con lecturas
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-border/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      Sin lecturas
    </span>
  );
}

function ScriptBox({ year }: { year: number }) {
  return (
    <section className="rounded-2xl border border-border bg-sidebar p-5">
      <h2 className="text-sm uppercase tracking-[0.2em] text-secondary">
        Actualizar el leccionario desde curas.com.ar
      </h2>
      <p className="mt-2 text-sm normal-case text-muted-foreground">
        La ingesta anual la corre un administrador desde la terminal del proyecto (no hay botón
        acá a propósito). Baja las lecturas del año y las guarda en la base.
      </p>
      <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-background p-3 text-xs">
        <code>npx tsx scripts/import-lecturas.ts --year={year + 1} --apply</code>
      </pre>
      <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 text-xs normal-case text-muted-foreground">
        <li>
          Requiere en <code>.env.local</code>: <code>SUPABASE_URL</code> y{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code>.
        </li>
        <li>Sin <code>--apply</code> corre en modo prueba (no escribe).</li>
        <li>Es idempotente (se puede repetir) y tarda ~3-4 minutos.</li>
        <li>
          <strong>Respeta las filas bloqueadas</strong>: no pisa las que editaste a mano acá.
        </li>
      </ul>
    </section>
  );
}
