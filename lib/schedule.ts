export type ScheduleEntityType = "playlist" | "announcement";
export type ScheduleDateMode = "always" | "weekdays" | "date_range";
export type ScheduleTimeMode = "all_day" | "range";

export type EntitySchedule = {
  id: string;
  entity_type: ScheduleEntityType;
  entity_id: string;
  date_mode: ScheduleDateMode;
  weekdays: number[] | null;
  start_date: string | null;
  end_date: string | null;
  time_mode: ScheduleTimeMode;
  start_time: string | null;
  end_time: string | null;
};

export type ScheduleInput = Omit<EntitySchedule, "id" | "entity_type" | "entity_id">;

const TZ = "America/Argentina/Buenos_Aires";

type ARParts = {
  year: number;
  month: number;
  day: number;
  weekday: number;
  minutes: number;
};

function nowInAR(at: Date): ARParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(at).map((p) => [p.type, p.value])
  );
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const hour = parts.hour === "24" ? 0 : Number(parts.hour);
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: weekdayMap[parts.weekday] ?? 0,
    minutes: hour * 60 + Number(parts.minute),
  };
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function dateMatchesCalendar(s: EntitySchedule, ar: ARParts): boolean {
  if (s.date_mode === "always") return true;
  if (s.date_mode === "weekdays") {
    return Boolean(s.weekdays?.includes(ar.weekday));
  }
  // date_range
  const today = `${ar.year}-${String(ar.month).padStart(2, "0")}-${String(ar.day).padStart(2, "0")}`;
  if (s.start_date && today < s.start_date) return false;
  if (s.end_date && today > s.end_date) return false;
  return true;
}

function timeMatchesWindow(s: EntitySchedule, ar: ARParts): boolean {
  if (s.time_mode === "all_day") return true;
  if (!s.start_time || !s.end_time) return true;
  const start = timeToMinutes(s.start_time);
  const end = timeToMinutes(s.end_time);
  if (start === end) return true;
  if (start < end) return ar.minutes >= start && ar.minutes < end;
  // Cruce de medianoche.
  return ar.minutes >= start || ar.minutes < end;
}

export function isVisibleNow(
  schedules: EntitySchedule[] | null | undefined,
  at: Date = new Date()
): boolean {
  if (!schedules || schedules.length === 0) return true;
  const ar = nowInAR(at);
  return schedules.some(
    (s) => dateMatchesCalendar(s, ar) && timeMatchesWindow(s, ar)
  );
}

// Acepta cualquier cliente Supabase (server o client) — la API es la
// misma para `from`, `delete`, `eq`, `insert`. Se tipa como SupabaseClient.
import type { SupabaseClient } from "@supabase/supabase-js";

export async function replaceSchedulesWith(
  supabase: SupabaseClient,
  entityType: ScheduleEntityType,
  entityId: string,
  schedules: ScheduleInput[]
): Promise<void> {
  const del = await supabase
    .from("entity_schedules")
    .delete()
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);
  if (del.error) throw new Error(del.error.message);
  if (schedules.length === 0) return;
  const rows = schedules.map((s) => ({
    entity_type: entityType,
    entity_id: entityId,
    date_mode: s.date_mode,
    weekdays: s.date_mode === "weekdays" ? s.weekdays : null,
    start_date: s.date_mode === "date_range" ? s.start_date : null,
    end_date: s.date_mode === "date_range" ? s.end_date : null,
    time_mode: s.time_mode,
    start_time: s.time_mode === "range" ? s.start_time : null,
    end_time: s.time_mode === "range" ? s.end_time : null,
  }));
  const ins = await supabase.from("entity_schedules").insert(rows);
  if (ins.error) throw new Error(ins.error.message);
}

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function describeWeekdays(days: number[]): string {
  if (days.length === 7) return "Todos los días";
  // Detectar L-V (1..5).
  const sorted = [...days].sort((a, b) => a - b);
  const isWeekdays = sorted.length === 5 && sorted.every((d, i) => d === i + 1);
  if (isWeekdays) return "Lunes a viernes";
  return sorted.map((d) => DAY_NAMES[d]).join(", ");
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function describeTime(s: EntitySchedule | ScheduleInput): string {
  if (s.time_mode === "all_day" || !s.start_time || !s.end_time) return "todo el día";
  const trim = (t: string) => t.slice(0, 5);
  return `de ${trim(s.start_time)} a ${trim(s.end_time)}`;
}

export function describeSchedule(s: EntitySchedule | ScheduleInput): string {
  let cal = "Siempre";
  if (s.date_mode === "weekdays" && s.weekdays && s.weekdays.length > 0) {
    cal = describeWeekdays(s.weekdays);
  } else if (s.date_mode === "date_range") {
    if (s.start_date && s.end_date) cal = `Del ${formatDate(s.start_date)} al ${formatDate(s.end_date)}`;
    else if (s.start_date) cal = `Desde ${formatDate(s.start_date)}`;
    else if (s.end_date) cal = `Hasta ${formatDate(s.end_date)}`;
  }
  const time = describeTime(s);
  if (s.time_mode === "all_day" && s.date_mode === "always") return "Siempre visible";
  if (s.time_mode === "all_day") return cal;
  if (s.date_mode === "always") return `Siempre, ${time}`;
  return `${cal}, ${time}`;
}

export function emptySchedule(): ScheduleInput {
  return {
    date_mode: "always",
    weekdays: null,
    start_date: null,
    end_date: null,
    time_mode: "all_day",
    start_time: null,
    end_time: null,
  };
}
