"use client";

import { TrashIcon, PlusIcon } from "@/app/components/icons";
import type {
  ScheduleInput,
  ScheduleDateMode,
  ScheduleTimeMode,
} from "@/lib/schedule";
import { emptySchedule } from "@/lib/schedule";

const DAY_LABELS = ["D", "L", "M", "M", "J", "V", "S"];

export function ScheduleEditor({
  value,
  onChange,
}: {
  value: ScheduleInput[];
  onChange: (next: ScheduleInput[]) => void;
}) {
  function update(idx: number, patch: Partial<ScheduleInput>) {
    onChange(value.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }
  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }
  function add() {
    onChange([...value, emptySchedule()]);
  }

  return (
    <div className="flex flex-col gap-4">
      {value.length === 0 ? (
        <p className="text-sm normal-case text-muted-foreground">
          Sin reglas configuradas. La playlist o anuncio se mostrará siempre.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {value.map((rule, idx) => (
            <li
              key={idx}
              className="rounded-lg border border-border bg-background p-4"
            >
              <Rule
                rule={rule}
                onChange={(patch) => update(idx, patch)}
                onRemove={() => remove(idx)}
              />
            </li>
          ))}
        </ul>
      )}
      <div>
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:border-primary hover:text-primary"
        >
          <PlusIcon />
          Agregar regla
        </button>
      </div>
    </div>
  );
}

function Rule({
  rule,
  onChange,
  onRemove,
}: {
  rule: ScheduleInput;
  onChange: (patch: Partial<ScheduleInput>) => void;
  onRemove: () => void;
}) {
  function setDateMode(mode: ScheduleDateMode) {
    if (mode === "always") {
      onChange({ date_mode: "always", weekdays: null, start_date: null, end_date: null });
    } else if (mode === "weekdays") {
      onChange({ date_mode: "weekdays", weekdays: [], start_date: null, end_date: null });
    } else {
      onChange({ date_mode: "date_range", weekdays: null });
    }
  }
  function setTimeMode(mode: ScheduleTimeMode) {
    if (mode === "all_day") {
      onChange({ time_mode: "all_day", start_time: null, end_time: null });
    } else {
      onChange({ time_mode: "range", start_time: rule.start_time ?? "08:00", end_time: rule.end_time ?? "20:00" });
    }
  }
  function toggleDay(day: number) {
    const current = rule.weekdays ?? [];
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b);
    onChange({ weekdays: next });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          <Field label="Calendario">
            <select
              value={rule.date_mode}
              onChange={(e) => setDateMode(e.target.value as ScheduleDateMode)}
              className={inputClass}
            >
              <option value="always">Siempre</option>
              <option value="weekdays">Días de la semana</option>
              <option value="date_range">Rango de fechas</option>
            </select>
          </Field>
          <Field label="Horario">
            <select
              value={rule.time_mode}
              onChange={(e) => setTimeMode(e.target.value as ScheduleTimeMode)}
              className={inputClass}
            >
              <option value="all_day">Todo el día</option>
              <option value="range">Franja horaria</option>
            </select>
          </Field>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Eliminar regla"
          title="Eliminar regla"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-destructive text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
        >
          <TrashIcon />
        </button>
      </div>

      {rule.date_mode === "weekdays" && (
        <div className="flex flex-wrap gap-2">
          {DAY_LABELS.map((label, i) => {
            const active = rule.weekdays?.includes(i) ?? false;
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggleDay(i)}
                aria-pressed={active}
                className={`flex h-9 w-9 items-center justify-center rounded-md border text-sm font-semibold transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {rule.date_mode === "date_range" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Desde">
            <input
              type="date"
              value={rule.start_date ?? ""}
              onChange={(e) => onChange({ start_date: e.target.value || null })}
              className={inputClass}
            />
          </Field>
          <Field label="Hasta">
            <div className="flex flex-col gap-1">
              <input
                type="date"
                value={rule.end_date ?? ""}
                onChange={(e) => onChange({ end_date: e.target.value || null })}
                className={inputClass}
                disabled={rule.end_date === null}
              />
              <label className="flex items-center gap-2 text-xs normal-case text-muted-foreground">
                <input
                  type="checkbox"
                  checked={rule.end_date === null}
                  onChange={(e) =>
                    onChange({ end_date: e.target.checked ? null : "" })
                  }
                />
                Sin fecha de fin
              </label>
            </div>
          </Field>
        </div>
      )}

      {rule.time_mode === "range" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Hora inicio">
            <input
              type="time"
              value={rule.start_time ?? ""}
              onChange={(e) => onChange({ start_time: e.target.value || null })}
              className={inputClass}
            />
          </Field>
          <Field label="Hora fin">
            <input
              type="time"
              value={rule.end_time ?? ""}
              onChange={(e) => onChange({ end_time: e.target.value || null })}
              className={inputClass}
            />
          </Field>
          <p className="text-xs normal-case text-muted-foreground sm:col-span-2">
            Si la hora de fin es menor que la de inicio, la franja cruza la medianoche.
          </p>
        </div>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm normal-case";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 normal-case">
      <span className="text-xs uppercase tracking-[0.15em] text-secondary">
        {label}
      </span>
      {children}
    </label>
  );
}
