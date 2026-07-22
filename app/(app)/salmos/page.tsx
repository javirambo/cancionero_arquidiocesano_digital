import { getDiaLiturgico, type LecturaSalmo } from "@/lib/calendario";
import { IntroSalmo } from "./intro-salmo";
import { SalmoAudioButton } from "./salmo-audio";

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

export default async function SalmosPage() {
  const today = todayBA();
  const dia = await getDiaLiturgico(today);
  const psalm = dia.lecturas.principal?.psalm ?? null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl uppercase tracking-wide text-page-title">Salmo responsorial</h1>

      <IntroSalmo />

      <h2 className="mt-4 text-lg font-semibold uppercase tracking-[0.15em] text-secondary">
        Salmo de hoy
      </h2>
      <p className="-mt-4 text-xs normal-case text-muted-foreground first-letter:uppercase">
        {displayDate(today)}
      </p>

      {psalm ? (
        <PsalmView psalm={psalm} />
      ) : (
        <p className="text-sm normal-case text-muted-foreground">
          No hay salmo cargado para hoy.
        </p>
      )}
    </main>
  );
}

function PsalmView({ psalm }: { psalm: NonNullable<LecturaSalmo> }) {
  const audio = psalm.audios[0] ?? null;
  // El título es la cita; lo previo a la coma va grande y los versículos, chicos.
  const refIdx = psalm.ref ? psalm.ref.indexOf(",") : -1;
  const refHead = psalm.ref ? (refIdx >= 0 ? psalm.ref.slice(0, refIdx) : psalm.ref) : "";
  const refTail = psalm.ref && refIdx >= 0 ? psalm.ref.slice(refIdx) : "";
  return (
    <div className="flex flex-col gap-5">
      {/* Título del salmo: la cita, en rojo. */}
      {psalm.ref && (
        <h3 className="font-bold normal-case text-song-title">
          <span className="text-xl">{refHead}</span>
          {refTail && <span className="text-sm">{refTail}</span>}
        </h3>
      )}

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

      {/* Estrofas: cada una termina cantando la respuesta (R.). */}
      {psalm.stanzas.map((stanza, i) => (
        <p key={i} className="whitespace-pre-line leading-relaxed normal-case text-foreground">
          {stanza.trim()} <span className="text-response">R.</span>
        </p>
      ))}
    </div>
  );
}
