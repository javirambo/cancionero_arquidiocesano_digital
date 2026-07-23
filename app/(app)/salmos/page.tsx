import { getDiaLiturgico, type LecturaSalmo } from "@/lib/calendario";
import { getLiturgicalDay } from "@/lib/liturgical";
import { IntroSalmo } from "./intro-salmo";
import { SalmoAudioButton } from "./salmo-audio";
import { CambiarFecha } from "./cambiar-fecha";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Salmo responsorial · Cancionero Arquidiocesano",
};

// Fecha de hoy en zona horaria de Buenos Aires, como "YYYY-MM-DD".
function todayBA(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Valida "YYYY-MM-DD" y que sea una fecha real (evita fechas inventadas por URL).
function isValidISODate(s: string | undefined): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// "miércoles, 22 de julio de 2026"
function displayDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

export default async function SalmosPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const sp = await searchParams;
  const today = todayBA();
  const selected = isValidISODate(sp.fecha) ? sp.fecha : today;
  const dia = await getDiaLiturgico(selected);
  const base = await getLiturgicalDay(selected); // dato de romcal (nombre · tiempo)
  const psalm = dia.lecturas.principal?.psalm ?? null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl uppercase tracking-wide text-page-title">Salmo responsorial</h1>

      <IntroSalmo />

      <div className="flex flex-col gap-2">
        <CambiarFecha selected={selected} today={today} dateLabel={displayDate(selected)} />
        {base && (
          <p className="text-center text-base normal-case text-foreground first-letter:uppercase">
            {base.name}
          </p>
        )}
      </div>

      {psalm ? (
        <PsalmView psalm={psalm} />
      ) : (
        <p className="text-sm normal-case text-muted-foreground">
          No hay salmo cargado para esta fecha.
        </p>
      )}
    </main>
  );
}

function PsalmView({ psalm }: { psalm: NonNullable<LecturaSalmo> }) {
  const audio = psalm.audios[0] ?? null;
  // Cita del salmo sin el prefijo "Sal" (ej. "Sal 62, 2-6.8-9" → "62, 2-6.8-9").
  const cleanRef = psalm.ref ? psalm.ref.replace(/^\s*Sal\b\.?\s*/i, "").trim() : "";
  return (
    <div className="flex flex-col gap-5">
      {/* Título: "SALMO" en negro + la cita (sin "Sal") en rojo. */}
      <h3 className="text-xl font-bold normal-case">
        <span className="text-foreground">SALMO</span>
        {cleanRef && (
          <>
            {" "}
            <span className="text-base text-song-title">{cleanRef}</span>
          </>
        )}
      </h3>

      {/* Partituras (antes de la antífona). */}
      {psalm.scores.map((s, i) =>
        s.url.toLowerCase().endsWith(".pdf") ? (
          <a
            key={i}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm normal-case text-primary hover:underline"
          >
            Ver partitura {s.label ? `(${s.label})` : ""}
          </a>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={i}
            src={s.url}
            alt={`Partitura ${s.label}`}
            className="w-full rounded-lg border border-border bg-card"
          />
        )
      )}

      {/* Un solo botón para escuchar, debajo de la partitura. */}
      {audio && <SalmoAudioButton url={audio.url} />}

      {/* Antífona / respuesta (sin negrita). */}
      <p className="leading-snug normal-case text-foreground">
        <span className="text-response">R.</span> {psalm.response}
      </p>

      {/* Respuestas alternativas ("O bien:"). */}
      {psalm.alt_responses.map((r, i) => (
        <p key={i} className="-mt-3 leading-snug normal-case text-foreground">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">O bien:</span>{" "}
          <span className="text-response">R.</span> {r}
        </p>
      ))}

      {/* Estrofas: cada una termina cantando la respuesta (R.). */}
      {psalm.stanzas.map((stanza, i) => (
        <p key={i} className="whitespace-pre-line leading-relaxed normal-case text-foreground">
          {stanza.trim()} <span className="text-response">R.</span>
        </p>
      ))}
    </div>
  );
}
