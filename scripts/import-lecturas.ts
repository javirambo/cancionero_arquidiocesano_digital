/**
 * Importa el calendario litúrgico con lecturas (leccionario) desde
 * curas.com.ar hacia la tabla `liturgical_readings` (migración 0056).
 *
 * Ver documentacion/calendario-liturgico-y-lecturas.md para la
 * arquitectura del sitio y el pipeline (§3).
 *
 * Pipeline:
 *   1. Baja los 12 ordo_{mes}_{año}.js.
 *   2. Ejecuta cada .js en un sandbox (vm) → materializa el array `ordo2`
 *      YA con los overrides del santoral aplicados (no reimplementamos la
 *      precedencia litúrgica: la resuelve el propio .js).
 *   3. Por día extrae: celebración, color y las URLs de lecturas ([5]/[6]).
 *   4. Baja y deduplica cada .htm de leccionario (muchos días comparten uno).
 *   5. Parsea el .htm → estructura {ref, heading, body} por sección.
 *   6. Upsert idempotente en liturgical_readings (on conflict event_date+reading_set).
 *      Excluye las filas con `locked=true` (ediciones manuales del CRUD de admin):
 *      no las pisa. Requiere la migración 0057; si falta, avisa y no filtra.
 *
 * Uso:
 *   npx tsx scripts/import-lecturas.ts                       # dry-run, año actual
 *   npx tsx scripts/import-lecturas.ts --year=2027           # dry-run de 2027
 *   npx tsx scripts/import-lecturas.ts --year=2027 --apply   # escribe en la BD
 *   npx tsx scripts/import-lecturas.ts --month=7 --limit=3   # probar pocos días
 *
 * Requiere en .env.local: SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) y
 * SUPABASE_SERVICE_ROLE_KEY.
 *
 * NOTA: el parser del .htm es best-effort sobre HTML legacy. Conviene
 * revisar la salida del dry-run tras el primer run real y ajustar los
 * heurísticos de parseLeccionario() si algún caso queda mal.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import vm from "node:vm";
import { createClient } from "@supabase/supabase-js";

// -----------------------------------------------------------------------------
// Configuración / flags
// -----------------------------------------------------------------------------

const BASE = "https://www.curas.com.ar/Calendario/";
const UA = "cancionero-arquidiocesano-import/1.0";
const THROTTLE_MS = 400; // servidor chico: throttling suave entre requests

const ARGS = process.argv.slice(2);
const APPLY = ARGS.includes("--apply");
const getFlag = (k: string): string | null => {
  const hit = ARGS.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : null;
};
const YEAR = Number(getFlag("year")) || new Date().getFullYear();
const ONLY_MONTH = getFlag("month") ? Number(getFlag("month")) : null;
const LIMIT = getFlag("limit") ? Number(getFlag("limit")) : null;

function loadDotEnv(path: string) {
  try {
    const txt = readFileSync(path, "utf8");
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let v = m[2];
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  } catch {
    /* ignore */
  }
}
loadDotEnv(resolve(process.cwd(), ".env.local"));

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (APPLY && (!SUPABASE_URL || !SERVICE_KEY)) {
  console.error("Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}
const supabase =
  SUPABASE_URL && SERVICE_KEY
    ? createClient(SUPABASE_URL, SERVICE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

// -----------------------------------------------------------------------------
// HTTP con throttling
// -----------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let lastFetch = 0;

async function fetchText(url: string): Promise<string> {
  const wait = THROTTLE_MS - (Date.now() - lastFetch);
  if (wait > 0) await sleep(wait);
  lastFetch = Date.now();
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

// -----------------------------------------------------------------------------
// Capa 1: ejecutar el .js del mes y materializar ordo2 con overrides aplicados
// -----------------------------------------------------------------------------

type DayRaw = {
  day: number;
  celebrationRaw: string | null;
  principalHref: string | null; // ordo2[6]
  memoriaHref: string | null; // ordo2[5]
};

function extractHref(cell: unknown): string | null {
  if (typeof cell !== "string") return null;
  // Solo aceptamos links a /Leccionarios/. Algunos días especiales (Triduo,
  // Ceniza, 1º de Adviento) traen en [5]/[6] un link a Misal o a Normascalit:
  // esos NO son lecturas y se descartan (no generan fila).
  for (const m of cell.matchAll(/href="([^"]+)"/gi)) {
    if (/\/Leccionarios\//i.test(m[1])) return m[1];
  }
  return null;
}

function runMonthJs(src: string, month: number): DayRaw[] {
  // Mock del entorno de browser/frameset: solo necesitamos que el .js no
  // rompa al construir `ordo2` y aplicar los if() de overrides del santoral.
  const sandbox: Record<string, unknown> = {
    document: { write: () => {}, writeln: () => {} },
    console: { log: () => {}, error: () => {}, warn: () => {} },
    navigator: { userAgent: UA },
    alert: () => {},
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.top = sandbox;
  sandbox.parent = sandbox;
  vm.createContext(sandbox);
  // String.prototype.link (método legacy) suele existir en V8, pero lo
  // garantizamos por las dudas: "txt".link(u) => <a href="u">txt</a>.
  const prelude =
    'if(!String.prototype.link){Object.defineProperty(String.prototype,"link",' +
    '{value:function(u){return "<a href=\\""+u+"\\">"+this+"</a>";}});}';
  try {
    vm.runInContext(prelude + "\n" + src, sandbox, { timeout: 8000 });
  } catch (e) {
    // El loop de render final puede lanzar (usa helpers del frameset). No
    // importa: `ordo2` ya quedó resuelto con los overrides ANTES del render.
    console.warn(`  (aviso mes ${month}: el .js lanzó al renderizar: ${(e as Error).message})`);
  }
  // `ordo2` se declara con `let`, así que NO queda en el global del sandbox:
  // lo leemos evaluando la expresión en el mismo contexto (el scope léxico
  // global persiste entre runInContext). El typeof evita ReferenceError.
  let ordo2: unknown;
  try {
    ordo2 = vm.runInContext(
      "typeof ordo2 !== 'undefined' ? ordo2 : (this && this.ordo2) || null",
      sandbox
    );
  } catch {
    ordo2 = (sandbox as { ordo2?: unknown }).ordo2;
  }
  if (!Array.isArray(ordo2)) throw new Error(`ordo2 no se materializó para el mes ${month}`);
  return (ordo2 as unknown[][]).map((entry, i) => ({
    day: i + 1,
    celebrationRaw: typeof entry?.[0] === "string" ? (entry[0] as string) : null,
    principalHref: extractHref(entry?.[6]),
    memoriaHref: extractHref(entry?.[5]),
  }));
}

// -----------------------------------------------------------------------------
// Helpers de texto / HTML
// -----------------------------------------------------------------------------

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", shy: "",
  iexcl: "¡", iquest: "¿", laquo: "«", raquo: "»", ndash: "–", mdash: "—",
  ntilde: "ñ", Ntilde: "Ñ", ccedil: "ç", Ccedil: "Ç",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú",
  agrave: "à", egrave: "è", ouml: "ö", uuml: "ü", Uuml: "Ü", uml: "¨",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-zA-Z]+);/g, (full, n) => (NAMED_ENTITIES[n] !== undefined ? NAMED_ENTITIES[n] : full));
}

function htmlToText(s: string): string {
  return decodeEntities(
    s
      .replace(/\r/g, "") // CR fuera
      .replace(/\n+/g, " ") // saltos del HTML fuente (soft-wrap) → espacio
      .replace(/<br\s*\/?>/gi, "\n") // saltos reales del contenido
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const clean = (s: string | null): string | null => {
  if (s == null) return null;
  const t = htmlToText(s).trim();
  return t || null;
};

const firstMatch = (s: string, re: RegExp): string | null => {
  const m = s.match(re);
  return m ? m[1] : null;
};

// Cita bíblica en rojo (ej. "6, 22-27", "Sal 66, 2-3"): primer <font rojo>
// que NO sea itálica (antífona), tenga algún dígito y sea corto. Se le quita
// una "R." final que a veces queda pegada en el salmo.
function refOf(slice: string): string | null {
  for (const m of slice.matchAll(/<font[^>]*#FF0000[^>]*>([\s\S]*?)<\/font>/gi)) {
    if (/<i>/i.test(m[1])) continue; // antífonas: rojo + itálica
    const t = clean(m[1]);
    if (!t || t === "+" || t === "R.") continue;
    if (/\d/.test(t) && t.length <= 45) return t.replace(/\s*R\.?\s*$/i, "").trim();
  }
  return null;
}

// Encabezado de la sección: primer <b>; si es una etiqueta (EVANGELIO/SALMO/
// ALELUIA), toma el <b> siguiente (ej. "Evangelio de nuestro Señor...").
function headingOf(slice: string): string | null {
  const bolds = [...slice.matchAll(/<b>([\s\S]*?)<\/b>/gi)].map((m) => clean(m[1])).filter(Boolean) as string[];
  if (!bolds.length) return null;
  const LABELS = new Set(["EVANGELIO", "SALMO", "ALELUIA", "ALELUYA"]);
  const h = LABELS.has(bolds[0].toUpperCase()) && bolds[1] ? bolds[1] : bolds[0];
  return h.replace(/^\+\s*/, "").trim() || null; // quita el "+" del evangelio
}

// Cuerpo de una sección: quita antífonas (<p align="right">), encabezados y
// etiquetas en <b>, y las citas/marcas en rojo; deja solo el texto.
function bodyOf(slice: string): string {
  let b = slice;
  // SALMO/ALELUIA/EVANGELIO arrancan a mitad de un <b> abierto antes (el de
  // "Palabra de Dios."): cortamos hasta su </b> de cierre.
  if (/^\s*(?:SALMO|ALELU[IY]A|EVANGELIO)\b/i.test(b)) b = b.replace(/^[\s\S]*?<\/b>/i, "");
  b = b
    .replace(/<p[^>]*align="?right"?[^>]*>[\s\S]*?<\/p>/gi, "")
    .replace(/<b>[\s\S]*?<\/b>/gi, "")
    .replace(/<font[^>]*#FF0000[^>]*>[\s\S]*?<\/font>/gi, "");
  return htmlToText(b);
}

// -----------------------------------------------------------------------------
// Capa 2: parsear el .htm del leccionario
// -----------------------------------------------------------------------------

type Reading = { ref: string | null; heading: string | null; body: string };
type Psalm = { ref: string | null; response: string | null; stanzas: string[] };
type Leccionario = {
  liturgical_time: string | null;
  day_label: string | null;
  first_reading: Reading | null;
  psalm: Psalm | null;
  second_reading: Reading | null;
  gospel_accl: Reading | null;
  gospel: Reading | null;
};

function parseHeader(html: string): { liturgical_time: string | null; day_label: string | null } {
  const m = html.match(/<p[^>]*align="?center"?[^>]*>([\s\S]*?)<\/p>/i);
  if (!m) return { liturgical_time: null, day_label: null };
  const block = m[1];
  const lines = htmlToText(block).split("\n").map((l) => l.trim()).filter(Boolean);
  const isDate = (l: string) => /^\d+[°ºo]?\s+de\s+\w+/i.test(l) || /^d[íi]a\b/i.test(l);
  // Tiempo/título litúrgico: en santoral/solemnidades va en un <font rojo> del
  // bloque; en las ferias no hay rojo y es la primera línea no-fecha
  // (ej. "TIEMPO DE NAVIDAD", con la fecha "DÍA 2 DE ENERO" aparte).
  const red = block.match(/<font[^>]*#FF0000[^>]*>([\s\S]*?)<\/font>/i);
  const redText = clean(red ? red[1] : null);
  const liturgical_time = (redText && !isDate(redText) ? redText : null) || lines.find((l) => !isDate(l)) || null;
  const rest = lines.filter((l) => l !== liturgical_time && !isDate(l));
  return { liturgical_time, day_label: rest.join(" ") || null };
}

// Divide el .htm en las secciones por sus encabezados <b> (§4 del análisis).
function splitSections(html: string) {
  const markers: { kind: string; index: number }[] = [];
  const push = (re: RegExp, kind: string) => {
    for (const m of html.matchAll(re)) markers.push({ kind, index: m.index ?? 0 });
  };
  // La primera/segunda lectura traen su propio <b>. SALMO/ALELUIA van siempre
  // en MAYÚSCULAS como etiqueta (nunca en el cuerpo, que usa "Aleluia." en
  // itálica). El EVANGELIO puede venir "EVANGELIO" o —en algunos días— con la
  // etiqueta "Evangelio</b>"; excluimos el encabezado largo "Evangelio de
  // nuestro Señor…" pidiendo que sea la palabra sola o justo antes de </b>.
  push(/<b>\s*(?:<[^>]+>)?\s*(?:Lectura|Principio|Comienzo|Continuaci[óo]n)\s+del?\b/gi, "reading");
  push(/\bSALMO\b|Salmo<\/b>/g, "psalm");
  push(/\bALELU[IY]A\b|Alelu[iy]a<\/b>/g, "accl");
  push(/EVANGELIO\b|Evangelio<\/b>/g, "gospel");
  markers.sort((a, b) => a.index - b.index);

  const out = { readings: [] as string[], psalm: null as string | null, accl: null as string | null, gospel: null as string | null };
  markers.forEach((mk, i) => {
    const end = i + 1 < markers.length ? markers[i + 1].index : html.length;
    const slice = html.slice(mk.index, end);
    if (mk.kind === "reading") out.readings.push(slice);
    else if (mk.kind === "psalm") out.psalm ??= slice;
    else if (mk.kind === "accl") out.accl ??= slice;
    else if (mk.kind === "gospel") out.gospel ??= slice;
  });
  return out;
}

function toReading(slice: string): Reading {
  return { ref: refOf(slice), heading: headingOf(slice), body: bodyOf(slice) };
}

function toPsalm(slice: string): Psalm {
  const ref = refOf(slice);
  const iMatch = slice.match(/<i>([\s\S]*?)<\/i>/i);
  const response = clean(iMatch ? iMatch[1] : null);
  // Cuerpo: quitar la antífona de la lectura siguiente (<p align="right"> que
  // cae dentro del slice), luego "SALMO … <font rojo>cita…R.</font>" (hasta el
  // primer </font>) y la respuesta inicial <i>…</i>; el resto son las estrofas.
  const body = slice
    .replace(/<p[^>]*align="?right"?[^>]*>[\s\S]*?<\/p>/gi, "")
    .replace(/^[\s\S]*?<\/font>/i, "")
    .replace(/^\s*<i>[\s\S]*?<\/i>/i, "");
  const stanzas = htmlToText(body)
    .split(/\n\s*\n/)
    .map((s) => s.replace(/\s*R\.?\s*$/i, "").trim()) // quita la "R." final de la estrofa
    .filter(Boolean);
  return { ref, response, stanzas };
}

function parseLeccionario(html: string): Leccionario {
  const header = parseHeader(html);
  const s = splitSections(html);
  return {
    liturgical_time: header.liturgical_time,
    day_label: header.day_label,
    first_reading: s.readings[0] ? toReading(s.readings[0]) : null,
    second_reading: s.readings[1] ? toReading(s.readings[1]) : null,
    psalm: s.psalm ? toPsalm(s.psalm) : null,
    gospel_accl: s.accl ? toReading(s.accl) : null,
    gospel: s.gospel ? toReading(s.gospel) : null,
  };
}

// -----------------------------------------------------------------------------
// Metadatos del día (celebración + color) desde ordo2[0]
// -----------------------------------------------------------------------------

const COLORS = new Set(["verde", "rojo", "blanco", "morado", "rosa", "negro"]);

function parseCelebration(raw: string | null): { celebration: string | null; color: string | null } {
  if (!raw) return { celebration: null, color: null };
  const text = htmlToText(raw).replace(/\s+/g, " ").trim();
  // El color va entre paréntesis, pero: (a) no siempre al final —"Solemnidad
  // (Blanco) NOMBRE"—, y (b) a veces da opciones —"(Morado o Rosado)". Tomamos
  // la primera palabra de color reconocida dentro de algún paréntesis.
  let color: string | null = null;
  for (const pm of text.matchAll(/\(([^)]*)\)/g)) {
    const cm = pm[1].toLowerCase().match(/verde|rojo|rosado|rosa|blanco|morado|negro/);
    if (cm) {
      color = cm[0] === "rosado" ? "rosa" : cm[0];
      break;
    }
  }
  const celebration =
    text.replace(/\([^)]*(?:verde|rojo|rosado|rosa|blanco|morado|negro)[^)]*\)/gi, "").replace(/\s+/g, " ").trim() ||
    null;
  return { celebration, color: color && COLORS.has(color) ? color : null };
}

// -----------------------------------------------------------------------------
// Persistencia
// -----------------------------------------------------------------------------

type Row = Leccionario & {
  event_date: string;
  reading_set: "principal" | "memoria";
  celebration: string | null;
  color: string | null;
  source_url: string;
  source_hash: string;
  imported_at: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

async function upsertRows(rows: Row[]) {
  if (!supabase) throw new Error("Cliente Supabase no inicializado");
  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase
      .from("liturgical_readings")
      .upsert(chunk, { onConflict: "event_date,reading_set" });
    if (error) throw new Error(`upsert ${i}: ${error.message}`);
    console.log(`  upsert ${i + chunk.length}/${rows.length}`);
  }
}

// Excluye del batch las filas marcadas `locked=true` en la BD (ediciones
// manuales del CRUD), para no pisarlas. Si la columna no existe todavía
// (falta migración 0057), avisa y no filtra.
async function excludeLocked(rows: Row[]): Promise<Row[]> {
  if (!supabase) return rows;
  const { data, error } = await supabase
    .from("liturgical_readings")
    .select("event_date, reading_set")
    .eq("locked", true);
  if (error) {
    console.warn(
      `  (aviso: no se pudo leer 'locked' (¿falta migración 0057?): ${error.message}). Se importa todo.`
    );
    return rows;
  }
  const locked = new Set((data ?? []).map((r) => `${r.event_date}|${r.reading_set}`));
  if (locked.size === 0) return rows;
  const kept = rows.filter((r) => !locked.has(`${r.event_date}|${r.reading_set}`));
  console.log(
    `  ${locked.size} fila(s) locked respetadas: ${rows.length - kept.length} omitidas del batch.`
  );
  return kept;
}

function printSample(rows: Row[]) {
  if (!rows.length) return;
  console.log("\n--- resumen por fila ---");
  for (const r of rows) {
    const sec = [
      r.first_reading ? "L1" : "--",
      r.psalm ? "Sal" : "---",
      r.second_reading ? "L2" : "--",
      r.gospel_accl ? "Al" : "--",
      r.gospel ? "Ev" : "--",
    ].join(" ");
    console.log(
      `${r.event_date} ${r.reading_set.padEnd(9)} ${(r.color ?? "?").padEnd(7)} [${sec}] ${(r.liturgical_time ?? "").slice(0, 40)}`
    );
  }
  console.log("\n--- muestra completa (primera fila) ---");
  console.log(JSON.stringify(rows[0], null, 2).slice(0, 2500));
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

async function main() {
  console.log(
    `Año: ${YEAR} · Modo: ${APPLY ? "APPLY (escribe)" : "DRY-RUN"}` +
      `${ONLY_MONTH ? ` · mes ${ONLY_MONTH}` : ""}${LIMIT ? ` · limit ${LIMIT}` : ""}`
  );

  const htmCache = new Map<string, string>(); // url → html (dedup)
  const rows: Row[] = [];
  const months = ONLY_MONTH ? [ONLY_MONTH] : Array.from({ length: 12 }, (_, i) => i + 1);
  let processed = 0;

  for (const month of months) {
    if (LIMIT && processed >= LIMIT) break;
    const jsUrl = `${BASE}ordo_${month}_${YEAR}.js`;
    console.log(`\n== Mes ${month} == ${jsUrl}`);
    let jsSrc: string;
    try {
      jsSrc = await fetchText(jsUrl);
    } catch (e) {
      console.warn(`  no se pudo bajar el mes: ${(e as Error).message}`);
      continue;
    }
    const days = runMonthJs(jsSrc, month);

    for (const d of days) {
      if (LIMIT && processed >= LIMIT) break;
      const { celebration, color } = parseCelebration(d.celebrationRaw);
      const event_date = `${YEAR}-${pad(month)}-${pad(d.day)}`;
      const sets: { reading_set: "principal" | "memoria"; href: string | null }[] = [
        { reading_set: "principal", href: d.principalHref },
        { reading_set: "memoria", href: d.memoriaHref },
      ];
      for (const s of sets) {
        if (!s.href) continue;
        const url = new URL(s.href, BASE).href;
        let html = htmCache.get(url) ?? null;
        if (html == null) {
          try {
            html = await fetchText(url);
            htmCache.set(url, html);
          } catch (e) {
            console.warn(`  ${event_date} ${s.reading_set}: ${(e as Error).message}`);
            continue;
          }
        }
        rows.push({
          event_date,
          reading_set: s.reading_set,
          celebration,
          color,
          ...parseLeccionario(html),
          source_url: url,
          source_hash: createHash("sha256").update(html).digest("hex"),
          imported_at: new Date().toISOString(),
        });
      }
      processed++;
    }
  }

  console.log(`\nFilas preparadas: ${rows.length} · .htm únicos descargados: ${htmCache.size}`);
  printSample(rows);

  if (!APPLY) {
    console.log("\n(DRY-RUN: no se escribió nada. Volvé a correr con --apply para persistir.)");
    return;
  }
  const toWrite = await excludeLocked(rows);
  await upsertRows(toWrite);
  console.log("Listo.");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
