"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUnsavedChanges } from "@/app/components/unsaved-changes-context";
import { getPublicImageUrl } from "@/lib/supabase/storage";
import { AudioButton, ImagePreviewButton } from "../../media-controls";
import type { ReadingRowFull, ReadingSet, SalmoMini } from "@/lib/lecturas-admin";

const COLORS = ["verde", "rojo", "blanco", "morado", "rosa", "negro"] as const;

// Colores litúrgicos reales (dato, no tema de la app) para el círculo del selector.
const COLOR_HEX: Record<string, string> = {
  verde: "#2e7d32",
  rojo: "#c62828",
  blanco: "#f5f5f5",
  morado: "#6a1b9a",
  rosa: "#ec8fb5",
  negro: "#222222",
};

type Romcal = { name: string; color: string | null; seasonName: string } | null;

type SectionState = { ref: string; heading: string; body: string };
type PsalmState = { ref: string; response: string; stanzas: string };
type SectionKey = "first_reading" | "second_reading" | "gospel_accl" | "gospel";

type SetState = {
  id: string | null;
  reading_set: ReadingSet;
  celebration: string;
  color: string;
  liturgical_time: string;
  day_label: string;
  first_reading: SectionState;
  psalm: PsalmState;
  second_reading: SectionState;
  gospel_accl: SectionState;
  gospel: SectionState;
  locked: boolean;
  salmo_id: string | null;
};

const emptySection = (): SectionState => ({ ref: "", heading: "", body: "" });
const emptyPsalm = (): PsalmState => ({ ref: "", response: "", stanzas: "" });

function sectionToState(s: ReadingRowFull["first_reading"]): SectionState {
  return { ref: s?.ref ?? "", heading: s?.heading ?? "", body: s?.body ?? "" };
}

function psalmToState(p: ReadingRowFull["psalm"]): PsalmState {
  return {
    ref: p?.ref ?? "",
    response: p?.response ?? "",
    stanzas: (p?.stanzas ?? []).join("\n\n"),
  };
}

function rowToState(row: ReadingRowFull): SetState {
  return {
    id: row.id,
    reading_set: row.reading_set,
    celebration: row.celebration ?? "",
    color: row.color ?? "",
    liturgical_time: row.liturgical_time ?? "",
    day_label: row.day_label ?? "",
    first_reading: sectionToState(row.first_reading),
    psalm: psalmToState(row.psalm),
    second_reading: sectionToState(row.second_reading),
    gospel_accl: sectionToState(row.gospel_accl),
    gospel: sectionToState(row.gospel),
    locked: row.locked,
    salmo_id: row.salmo_id,
  };
}

// Fila nueva. La principal de un día sin lecturas precarga nombre/color/tiempo
// desde romcal. Nueva = bloqueada.
function blankSet(reading_set: ReadingSet, romcal: Romcal): SetState {
  const pre = reading_set === "principal" && romcal;
  return {
    id: null,
    reading_set,
    celebration: pre ? romcal.name : "",
    color: pre ? romcal.color ?? "" : "",
    liturgical_time: pre ? romcal.seasonName : "",
    day_label: "",
    first_reading: emptySection(),
    psalm: emptyPsalm(),
    second_reading: emptySection(),
    gospel_accl: emptySection(),
    gospel: emptySection(),
    locked: true,
    salmo_id: null,
  };
}

function sectionToJson(s: SectionState) {
  if (!s.ref.trim() && !s.heading.trim() && !s.body.trim()) return null;
  return { ref: s.ref.trim() || null, heading: s.heading.trim() || null, body: s.body };
}

function psalmToJson(p: PsalmState) {
  const stanzas = p.stanzas.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
  if (!p.ref.trim() && !p.response.trim() && stanzas.length === 0) return null;
  return { ref: p.ref.trim() || null, response: p.response.trim() || null, stanzas };
}

function buildPayload(s: SetState) {
  return {
    celebration: s.celebration.trim() || null,
    color: s.color || null,
    liturgical_time: s.liturgical_time.trim() || null,
    day_label: s.day_label.trim() || null,
    first_reading: sectionToJson(s.first_reading),
    psalm: psalmToJson(s.psalm),
    second_reading: sectionToJson(s.second_reading),
    gospel_accl: sectionToJson(s.gospel_accl),
    gospel: sectionToJson(s.gospel),
    locked: s.locked,
    salmo_id: s.salmo_id,
  };
}

function isEmptySet(s: SetState): boolean {
  if (s.salmo_id) return false;
  const p = buildPayload(s);
  return (
    !p.celebration && !p.color && !p.liturgical_time && !p.day_label &&
    !p.first_reading && !p.psalm && !p.second_reading && !p.gospel_accl && !p.gospel
  );
}

export function LecturasForm({
  date,
  rows,
  salmos,
  romcal,
}: {
  date: string;
  rows: ReadingRowFull[];
  salmos: SalmoMini[];
  romcal: Romcal;
}) {
  const router = useRouter();
  const principalRow = rows.find((r) => r.reading_set === "principal");
  const memoriaRow = rows.find((r) => r.reading_set === "memoria");

  const makeInitialSets = (): SetState[] => {
    const initial: SetState[] = [
      principalRow ? rowToState(principalRow) : blankSet("principal", romcal),
    ];
    if (memoriaRow) initial.push(rowToState(memoriaRow));
    return initial;
  };
  const [sets, setSets] = useState<SetState[]>(makeInitialSets);
  const [initialJson] = useState(() => JSON.stringify(makeInitialSets()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reportar a la botonera si hay cambios sin guardar (para confirmar al salir).
  const dirty = JSON.stringify(sets) !== initialJson;
  const { setDirty } = useUnsavedChanges();
  useEffect(() => {
    setDirty(dirty);
    return () => setDirty(false);
  }, [dirty, setDirty]);

  const backHref = `/admin/lecturas?mes=${date.slice(0, 7)}`;
  const hasMemoria = sets.some((s) => s.reading_set === "memoria");

  function patchSet(i: number, patch: Partial<SetState>) {
    setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function patchSection(i: number, key: SectionKey, patch: Partial<SectionState>) {
    setSets((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, [key]: { ...s[key], ...patch } } : s))
    );
  }
  function patchPsalm(i: number, patch: Partial<PsalmState>) {
    setSets((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, psalm: { ...s.psalm, ...patch } } : s))
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();
    for (const s of sets) {
      const payload = buildPayload(s);
      if (s.id) {
        const { error: upErr } = await supabase
          .from("liturgical_readings")
          .update(payload)
          .eq("id", s.id);
        if (upErr) {
          setError(upErr.message);
          setSaving(false);
          return;
        }
      } else if (!isEmptySet(s)) {
        const { error: insErr } = await supabase.from("liturgical_readings").insert({
          event_date: date,
          reading_set: s.reading_set,
          source_url: "manual",
          ...payload,
        });
        if (insErr) {
          setError(
            insErr.code === "23505"
              ? `Ya existe una fila "${s.reading_set}" para este día.`
              : insErr.message
          );
          setSaving(false);
          return;
        }
      }
    }
    router.push(backHref);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {sets.map((s, i) => (
        <section key={s.reading_set} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg text-page-title">
              {s.reading_set === "principal" ? "Lecturas (principal)" : "Lecturas de la memoria"}
            </h2>
            <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-foreground normal-case">
              <input
                type="checkbox"
                checked={s.locked}
                onChange={(e) => patchSet(i, { locked: e.target.checked })}
              />
              Bloqueada (no la pisa la ingesta anual)
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Celebración">
              <input
                type="text"
                value={s.celebration}
                onChange={(e) => patchSet(i, { celebration: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Color">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-6 w-6 shrink-0 rounded-full border border-border"
                  style={{ backgroundColor: s.color ? COLOR_HEX[s.color] : "transparent" }}
                />
                <select
                  value={s.color}
                  onChange={(e) => patchSet(i, { color: e.target.value })}
                  className={inputClass}
                >
                  <option value="">— sin color —</option>
                  {COLORS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
            <Field label="Tiempo litúrgico">
              <input
                type="text"
                value={s.liturgical_time}
                onChange={(e) => patchSet(i, { liturgical_time: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Subtítulo del día">
              <input
                type="text"
                value={s.day_label}
                onChange={(e) => patchSet(i, { day_label: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>

          <SeccionEditor
            titulo="Primera lectura"
            value={s.first_reading}
            onChange={(patch) => patchSection(i, "first_reading", patch)}
          />
          <SalmoEditor value={s.psalm} onChange={(patch) => patchPsalm(i, patch)} />
          <SalmoLink
            salmoId={s.salmo_id}
            salmos={salmos}
            onChange={(id) => patchSet(i, { salmo_id: id })}
          />
          <SeccionEditor
            titulo="Segunda lectura (opcional)"
            value={s.second_reading}
            onChange={(patch) => patchSection(i, "second_reading", patch)}
          />
          <SeccionEditor
            titulo="Aleluya / aclamación"
            value={s.gospel_accl}
            onChange={(patch) => patchSection(i, "gospel_accl", patch)}
          />
          <SeccionEditor
            titulo="Evangelio"
            value={s.gospel}
            onChange={(patch) => patchSection(i, "gospel", patch)}
          />
        </section>
      ))}

      {!hasMemoria && (
        <button
          type="button"
          onClick={() => setSets((prev) => [...prev, blankSet("memoria", romcal)])}
          className="self-start rounded-full border border-border px-4 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:border-primary hover:text-primary"
        >
          + Agregar lecturas de la memoria
        </button>
      )}

      {error && <p className="text-sm normal-case text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full border border-primary bg-primary px-5 py-2 text-sm font-semibold uppercase tracking-wide text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => router.push(backHref)}
          className="rounded-full border border-border px-5 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:border-primary hover:text-primary"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm normal-case";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 normal-case">
      <span className="text-xs uppercase tracking-[0.15em] text-secondary">{label}</span>
      {children}
    </label>
  );
}

function SeccionEditor({
  titulo,
  value,
  onChange,
}: {
  titulo: string;
  value: SectionState;
  onChange: (patch: Partial<SectionState>) => void;
}) {
  return (
    <fieldset className="rounded-lg border border-border p-3">
      <legend className="px-1 text-xs uppercase tracking-wide text-secondary">{titulo}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          type="text"
          placeholder="Cita (ej. Jn 1, 1-18)"
          value={value.ref}
          onChange={(e) => onChange({ ref: e.target.value })}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="Encabezado (ej. Lectura del libro de los Números)"
          value={value.heading}
          onChange={(e) => onChange({ heading: e.target.value })}
          className={inputClass}
        />
      </div>
      <textarea
        placeholder="Texto de la lectura"
        value={value.body}
        onChange={(e) => onChange({ body: e.target.value })}
        rows={4}
        className={`${inputClass} mt-2`}
      />
    </fieldset>
  );
}

function SalmoEditor({
  value,
  onChange,
}: {
  value: PsalmState;
  onChange: (patch: Partial<PsalmState>) => void;
}) {
  return (
    <fieldset className="rounded-lg border border-border p-3">
      <legend className="px-1 text-xs uppercase tracking-wide text-secondary">Salmo (texto)</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          type="text"
          placeholder="Cita (ej. Sal 66, 2-3)"
          value={value.ref}
          onChange={(e) => onChange({ ref: e.target.value })}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="Respuesta (estribillo)"
          value={value.response}
          onChange={(e) => onChange({ response: e.target.value })}
          className={inputClass}
        />
      </div>
      <textarea
        placeholder="Estrofas — una por bloque, separadas por una línea en blanco"
        value={value.stanzas}
        onChange={(e) => onChange({ stanzas: e.target.value })}
        rows={5}
        className={`${inputClass} mt-2`}
      />
    </fieldset>
  );
}

// Vínculo al salmo del catálogo (audio + partitura). Muestra el linkeado en modo
// lectura y permite cambiar/desvincular buscando por nº o antífona.
function SalmoLink({
  salmoId,
  salmos,
  onChange,
}: {
  salmoId: string | null;
  salmos: SalmoMini[];
  onChange: (id: string | null) => void;
}) {
  const linked = salmos.find((s) => s.id === salmoId) ?? null;
  const [initialId] = useState(salmoId);
  const changed = salmoId !== initialId;
  const [picking, setPicking] = useState(false);
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const results = term
    ? salmos
        .filter(
          (s) => String(s.psalm_number) === term || s.response.toLowerCase().includes(term)
        )
        .slice(0, 12)
    : [];

  return (
    <fieldset className="rounded-lg border border-border p-3">
      <legend className="px-1 text-xs uppercase tracking-wide text-secondary">
        Salmo (audio / partitura)
      </legend>

      {linked ? (
        <div className="flex flex-col gap-2">
          <span className="text-sm text-foreground normal-case">
            Sal {linked.psalm_number} — {linked.response}
          </span>
          {linked.audios.map((a, i) => (
            <div key={`a${i}`} className="flex items-center gap-2">
              <span className="w-20 shrink-0 truncate text-[10px] uppercase tracking-wide text-muted-foreground">
                {a.label}
              </span>
              <AudioButton url={getPublicImageUrl(a.path)} label={a.label} />
            </div>
          ))}
          {linked.scores.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              {linked.scores.map((s, i) => (
                <span
                  key={`s${i}`}
                  className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground"
                >
                  {s.label}
                  <ImagePreviewButton url={getPublicImageUrl(s.path)} />
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPicking((v) => !v)}
              className="rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:border-primary hover:text-primary"
            >
              Cambiar
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:border-destructive hover:text-destructive"
            >
              Desvincular
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="rounded-full border border-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary hover:bg-primary hover:text-primary-foreground"
        >
          Vincular salmo
        </button>
      )}

      {picking && (
        <div className="mt-2 flex flex-col gap-2">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nº o antífona…"
            autoFocus
            className={inputClass}
          />
          {results.length > 0 && (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {results.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(s.id);
                      setPicking(false);
                      setQ("");
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm normal-case hover:bg-sidebar"
                  >
                    <span className="shrink-0 text-secondary">Sal {s.psalm_number}</span>
                    <span className="min-w-0 flex-1 truncate">{s.response}</span>
                    {s.audios.length > 0 && <span className="shrink-0 text-[10px] text-primary">audio</span>}
                    {s.scores.length > 0 && <span className="shrink-0 text-[10px] text-primary">part.</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {changed ? (
        <p className="mt-2 text-xs font-semibold normal-case text-destructive">
          Cambiaste el salmo vinculado. Se aplica al apretar <strong>Guardar</strong>; si salís sin
          guardar, se pierde.
        </p>
      ) : (
        linked && (
          <p className="mt-2 text-[11px] normal-case text-muted-foreground">
            (Para agregar nuevos cantos y partituras de salmos, ir a admin/salmos)
          </p>
        )
      )}
    </fieldset>
  );
}
