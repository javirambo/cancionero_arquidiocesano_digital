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
 *   7. Prune: borra las filas no-locked de los meses importados que ya no se
 *      generan (residuales de ingestas anteriores). Se puede desactivar con
 *      --no-prune; se omite en corridas parciales (--limit).
 *
 * Uso:
 *   npx tsx scripts/import-lecturas.ts                       # dry-run, año actual
 *   npx tsx scripts/import-lecturas.ts --year=2027           # dry-run de 2027
 *   npx tsx scripts/import-lecturas.ts --year=2027 --apply   # escribe en la BD
 *   npx tsx scripts/import-lecturas.ts --month=7 --limit=3   # probar pocos días
 *   npx tsx scripts/import-lecturas.ts --refresh             # ignora la caché y re-descarga
 *   npx tsx scripts/import-lecturas.ts --apply --no-prune    # no borra residuales
 *
 * Caché: los .js/.htm bajados se guardan en scripts/.ordo-cache/ (git la ignora)
 * y se reusan en las siguientes corridas para no re-descargar. `--refresh` la ignora.
 *
 * Requiere en .env.local: SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) y
 * SUPABASE_SERVICE_ROLE_KEY.
 *
 * NOTA: el parser del .htm es best-effort sobre HTML legacy. Conviene
 * revisar la salida del dry-run tras el primer run real y ajustar los
 * heurísticos de parseLeccionario() si algún caso queda mal.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
// Caché en disco de los .js/.htm bajados (se re-corre el script muchas veces).
// Se crea sola; git la ignora (contenido con derechos de autor). `--refresh`
// fuerza la re-descarga.
const CACHE_DIR = resolve(process.cwd(), "scripts/.ordo-cache");

const ARGS = process.argv.slice(2);
const APPLY = ARGS.includes("--apply");
const REFRESH = ARGS.includes("--refresh");
const NO_PRUNE = ARGS.includes("--no-prune");
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

// Nombre de archivo de caché para una URL (host + path saneados).
function cachePathFor(url: string): string {
  const name = url.replace(/^https?:\/\//, "").replace(/[^a-zA-Z0-9._-]/g, "_");
  return resolve(CACHE_DIR, name);
}

async function fetchText(url: string): Promise<string> {
  const cacheFile = cachePathFor(url);
  if (!REFRESH && existsSync(cacheFile)) return readFileSync(cacheFile, "utf8");
  const wait = THROTTLE_MS - (Date.now() - lastFetch);
  if (wait > 0) await sleep(wait);
  lastFetch = Date.now();
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  // Casi todo es UTF-8, pero alguna página (ej. Biografias02.htm) está en
  // latin1: si el decode UTF-8 dejó caracteres de reemplazo, re-decodificamos
  // como windows-1252. La caché guarda ya el texto correcto (UTF-8).
  let text = new TextDecoder("utf-8").decode(buf);
  if (text.includes("�")) text = new TextDecoder("windows-1252").decode(buf);
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cacheFile, text, "utf8");
  return text;
}

// -----------------------------------------------------------------------------
// Capa 1: ejecutar el .js del mes y materializar ordo2 con overrides aplicados
// -----------------------------------------------------------------------------

type DaySet = {
  reading_set: string;
  href: string;
  celebration: string | null;
  color: string | null;
};

type DayRaw = {
  day: number;
  sets: DaySet[];
  saints: SaintRaw[];
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

// Texto del ancla de un link a leccionario: la etiqueta que el ORDO le pone
// ("de la feria" / "de la memoria" / "del Propio…" / "noche" / "aurora" / "dia").
function linkLabel(cell: string, href: string): string {
  const esc = href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = cell.match(new RegExp(`<a[^>]*href="${esc}"[^>]*>([\\s\\S]*?)</a>`, "i"));
  return (m ? htmlToText(m[1]) : htmlToText(cell)).trim();
}

// ¿La celda es una celebración "Nombre (Color)"? (tiene un color entre
// paréntesis y no es una línea de "Misa:"/"Lecturas:"). Sirve para asociar
// cada lectura a su celebración en los días "empaquetados" (ej. 24/12: feria
// + "Natividad del Señor (Blanco)").
function isCelebrationCell(cell: unknown): cell is string {
  if (typeof cell !== "string") return false;
  const t = htmlToText(cell);
  return (
    /\([^)]*(?:verde|rojo|rosado|rosa|blanco|morado|negro)[^)]*\)/i.test(t) &&
    !/Lecturas:|Misa:/i.test(t)
  );
}

// Clasifica una etiqueta de leccionario en un reading_set. Las etiquetas
// EXACTAS noche/aurora/dia/vigilia marcan los tiempos de un día empaquetado
// (Navidad); "de la memoria" → memoria; el resto ("de la feria", "del
// Propio…", "del Propio del día") → principal.
function classifySet(label: string): string {
  const t = label.trim().toLowerCase();
  if (t === "noche") return "noche";
  if (t === "aurora") return "aurora";
  if (t === "dia" || t === "día") return "dia";
  if (/vigilia/.test(t)) return "vigilia";
  if (/de la memoria/.test(t)) return "memoria";
  return "principal";
}

function uniqueSet(base: string, used: Set<string>): string {
  let n = 2;
  while (used.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

// Arma los sets (una fila por lectura) de una entrada de ordo2, recolectando
// TODOS los links /Leccionarios/ en cualquier índice (no solo [5]/[6]), para
// soportar los días empaquetados. Cada set recibe celebración+color de la
// celebración más cercana que lo precede, y desambigua sets genéricos
// colisionados usando la etiqueta de misa cercana (vigilia/noche/aurora).
function buildDaySets(entry: unknown[]): DaySet[] {
  const celebs: { index: number; celebration: string | null; color: string | null }[] = [];
  entry.forEach((cell, i) => {
    if (i === 0 || isCelebrationCell(cell)) {
      const { celebration, color } = parseCelebration(typeof cell === "string" ? cell : null);
      if (celebration || color) celebs.push({ index: i, celebration, color });
    }
  });
  const celebFor = (index: number) => {
    let best: { celebration: string | null; color: string | null } = celebs[0] ?? {
      celebration: null,
      color: null,
    };
    for (const c of celebs) if (c.index <= index) best = c;
    return best;
  };
  // Palabra clave de tiempo en las celdas de misa/celebración anteriores (para
  // desambiguar dos sets genéricos: 24/12 feria(principal) + vigilia).
  const contextKeyword = (before: number): string | null => {
    let found: string | null = null;
    entry.forEach((cell, i) => {
      if (i >= before || typeof cell !== "string") return;
      const t = cell.toLowerCase();
      if (/vigilia/.test(t)) found = "vigilia";
      else if (/\bnoche\b/.test(t)) found = "noche";
      else if (/\baurora\b/.test(t)) found = "aurora";
    });
    return found;
  };

  const used = new Set<string>();
  const sets: DaySet[] = [];
  entry.forEach((cell, i) => {
    if (typeof cell !== "string") return;
    const href = extractHref(cell);
    if (!href) return;
    let set = classifySet(linkLabel(cell, href));
    if (used.has(set)) {
      const kw = contextKeyword(i);
      set = kw && !used.has(kw) ? kw : uniqueSet(set, used);
    }
    used.add(set);
    const { celebration, color } = celebFor(i);
    sets.push({ reading_set: set, href, celebration, color });
  });
  return sets;
}

// -----------------------------------------------------------------------------
// Santos del día (ordo2[1]/[2] + páginas Biografias)
// -----------------------------------------------------------------------------

type SaintRaw = { name: string; description: string | null; bioHref: string | null };
type Saint = { name: string; description: string | null; bio_url: string | null; bio: string | null };

// Extrae el/los santo(s) de una entrada de ordo2. Los santos vienen en [1] y
// [2] como `"Nombre".link(".../Biografias3/BiografiasMM.htm#ancla") + ", desc"`.
// El 2º santo a veces viene sin link (solo texto).
// El descriptor ("presbítero", "Papa", …) nunca lleva paréntesis legítimos;
// curas a veces le pega el color litúrgico ("Papa (Blanco)"): lo quitamos.
const cleanDesc = (s: string): string | null =>
  s.replace(/\([^)]*\)/g, "").replace(/^[\s,]+|[\s,]+$/g, "").replace(/\s+/g, " ").trim() || null;
// El nombre en Cuaresma viene entre corchetes ("[San Casimiro]", memoria
// opcional): los quitamos.
const cleanName = (s: string): string => s.replace(/[[\]]/g, "").replace(/\s+/g, " ").trim();

function extractSaints(entry: unknown[]): SaintRaw[] {
  const out: SaintRaw[] = [];
  for (const idx of [1, 2]) {
    const cell = entry[idx];
    if (typeof cell !== "string") continue;
    const hrefMatch = cell.match(/href="([^"]*Biografias3[^"]*)"/i);
    if (hrefMatch) {
      const a = cell.match(/<a[^>]*>([\s\S]*?)<\/a>([\s\S]*)/i);
      const name = cleanName(htmlToText(a?.[1] ?? ""));
      const description = cleanDesc(htmlToText(a?.[2] ?? ""));
      if (name) out.push({ name, description, bioHref: hrefMatch[1] });
    } else if (idx === 2 && out.length > 0) {
      // 2º santo sin link (solo texto). Evitar títulos en rojo / Misa/Lecturas.
      if (/<font/i.test(cell) || /Misa:|Lecturas:/i.test(cell)) continue;
      const t = htmlToText(cell).trim();
      if (!t) continue;
      const [name, ...desc] = t.split(/,\s*/);
      out.push({ name: cleanName(name), description: cleanDesc(desc.join(", ")), bioHref: null });
    }
  }
  return out;
}

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const stripAccents = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
const norm = (s: string) => stripAccents(s).toLowerCase().replace(/\s+/g, " ").trim();
// Fecha de un encabezado de biografía: "4 de marzo", "1° de noviembre".
const DATE_RE = /(?<!\d)(\d{1,2})(?!\d)\D{0,12}?de\s+([a-zñáéíóú]+)/i;

// Posiciones candidatas del bloque de una bio, de más a menos confiable. Las
// anclas de curas son poco confiables (faltan, tienen typo, o el 1er santo del
// mes no tiene ancla), así que además probamos por día y por el encabezado de
// fecha "N de MES", y por el nombre en <b>.
function bioCandidateStarts(html: string, anchor: string, name: string, day: number, monthName: string): number[] {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const starts: number[] = [];
  const push = (re: RegExp) => {
    const i = html.search(re);
    if (i >= 0) starts.push(i);
  };
  if (anchor) push(new RegExp(`<a\\s+name="${esc(anchor)}"`, "i"));
  push(new RegExp(`<a\\s+name="${day}"`, "i"));
  push(new RegExp(`<a\\s+name="${String(day).padStart(2, "0")}"`, "i"));
  push(new RegExp(`(?<!\\d)${day}(?!\\d)\\D{0,12}?de\\s+${monthName}`, "i"));
  if (name) {
    const target = norm(name);
    for (const m of html.matchAll(/<b>([\s\S]*?)<\/b>/gi)) {
      const t = norm(htmlToText(m[1]));
      if (t && (t === target || t.includes(target) || target.includes(t))) {
        starts.push(m.index ?? -1);
        break;
      }
    }
  }
  return [...new Set(starts.filter((i) => i >= 0))].sort((a, b) => a - b);
}

// Extrae la bio a partir de un start: sección hasta el próximo <a name=> o
// <p align="center"> (encabezado del día siguiente); cuerpo = <p align="justify">.
// DOBLE-CHECK: si la sección trae un encabezado "N de MES", debe coincidir con
// el día/mes esperado; si no, no es esta bio (devuelve null).
function bioAtStart(html: string, start: number, day: number, monthName: string): string | null {
  const rest = html.slice(start);
  const after = rest.slice(1);
  const cuts = [after.search(/<a\s+name="/i), after.search(/<p[^>]*align="?center"?/i)].filter((x) => x >= 0);
  const section = cuts.length ? rest.slice(0, Math.min(...cuts) + 1) : rest;
  const head = htmlToText(section.slice(0, 220));
  const dm = head.match(DATE_RE);
  if (dm && (Number(dm[1]) !== day || norm(dm[2]) !== monthName)) return null;
  const paras = [...section.matchAll(/<p[^>]*align="?justify"?[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => htmlToText(m[1]))
    .filter(Boolean);
  return paras.join("\n\n") || null;
}

function parseBio(html: string, anchor: string, name: string, day: number, month: number): string | null {
  const monthName = MONTHS[month - 1] ?? "";
  for (const start of bioCandidateStarts(html, anchor, name, day, monthName)) {
    const bio = bioAtStart(html, start, day, monthName);
    if (bio) return bio;
  }
  return null;
}

// Resuelve los santos de un día: baja (cacheada) la página de biografías y
// extrae el texto de cada uno (localización robusta + verificación de fecha).
async function resolveSaints(
  raw: SaintRaw[],
  htmCache: Map<string, string>,
  month: number,
  day: number
): Promise<Saint[]> {
  const out: Saint[] = [];
  for (const s of raw) {
    let bio: string | null = null;
    let bio_url: string | null = null;
    if (s.bioHref) {
      const full = new URL(s.bioHref, BASE);
      bio_url = full.href;
      const pageUrl = full.href.split("#")[0];
      const anchor = decodeURIComponent(full.hash.replace(/^#/, ""));
      let html = htmCache.get(pageUrl) ?? null;
      if (html == null) {
        try {
          html = await fetchText(pageUrl);
          htmCache.set(pageUrl, html);
        } catch (e) {
          console.warn(`  bio "${s.name}": ${(e as Error).message}`);
        }
      }
      if (html) {
        bio = parseBio(html, anchor, s.name, day, month);
        if (!bio) console.warn(`  bio "${s.name}" (${MONTHS[month - 1]} ${day}): no se pudo extraer/verificar`);
      }
    }
    out.push({ name: s.name, description: s.description, bio_url, bio });
  }
  return out;
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
    sets: Array.isArray(entry) ? buildDaySets(entry) : [],
    saints: Array.isArray(entry) ? extractSaints(entry) : [],
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

type ReadingOption = { ref: string | null; heading: string | null; body: string };
// Una lectura puede traer opciones alternativas separadas por "O bien:" en la
// página; la primera va arriba y el resto en `alternatives`.
type Reading = ReadingOption & { alternatives?: ReadingOption[] };
type Psalm = { ref: string | null; response: string | null; alt_responses?: string[]; stanzas: string[] };
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
  // El bloque rojo del título puede abarcar dos líneas con <br> ("TIEMPO
  // DURANTE EL AÑO" + "DECIMOCUARTA SEMANA"): es UN solo título litúrgico, así
  // que colapsamos los saltos internos a un espacio (si no, al mostrarse queda
  // "AÑODECIMOCUARTA" pegado).
  const redRaw = clean(red ? red[1] : null);
  const redLines = redRaw ? redRaw.split("\n").map((l) => l.trim()).filter(Boolean) : [];
  const redText = redRaw ? redRaw.replace(/\s*\n+\s*/g, " ") : null;
  const liturgical_time = (redText && !isDate(redText) ? redText : null) || lines.find((l) => !isDate(l)) || null;
  // day_label: las líneas que no forman parte del título rojo ni son fechas
  // (evita duplicar el tiempo litúrgico dentro del label).
  const rest = lines.filter((l) => !redLines.includes(l) && l !== liturgical_time && !isDate(l));
  return { liturgical_time, day_label: rest.join(" ") || null };
}

// Divide el .htm en secciones por sus encabezados <b> (§4 del análisis).
// El SALMO actúa de DIVISOR: las lecturas antes del salmo son la 1ª lectura
// (con sus alternativas "O bien:"); las que van entre el salmo y el evangelio
// son la 2ª lectura. Devuelve `slots`: slots[0] = opciones de la 1ª lectura,
// slots[1] = opciones de la 2ª (cada opción es un slice de HTML).
function splitSections(html: string) {
  type Kind = "reading" | "psalm" | "accl" | "gospel";
  const markers: { kind: Kind; index: number }[] = [];
  const push = (re: RegExp, kind: Kind) => {
    for (const m of html.matchAll(re)) markers.push({ kind, index: m.index ?? 0 });
  };
  push(/<b>\s*(?:<[^>]+>)?\s*(?:Lectura|Principio|Comienzo|Continuaci[óo]n)\s+del?\b/gi, "reading");
  push(/\bSALMO\b|Salmo<\/b>/g, "psalm");
  push(/\bALELU[IY]A\b|Alelu[iy]a<\/b>/g, "accl");
  push(/EVANGELIO\b|Evangelio<\/b>/g, "gospel");
  markers.sort((a, b) => a.index - b.index);
  // Posiciones de "O bien:" — agrupan lecturas alternativas del mismo slot
  // (el "O bien:" del salmo/evangelio no cae entre dos encabezados de lectura,
  // así que no afecta el agrupamiento).
  const obien = [...html.matchAll(/O\s*bien/gi)].map((m) => m.index ?? 0);

  let psalm: string | null = null;
  let accl: string | null = null;
  let gospel: string | null = null;
  const slots: string[][] = [];
  let prevReadingIndex = -1;
  let sawDivider = true; // true al inicio → la 1ª lectura abre un slot
  markers.forEach((mk, i) => {
    const end = i + 1 < markers.length ? markers[i + 1].index : html.length;
    const slice = html.slice(mk.index, end);
    if (mk.kind === "reading") {
      const isAlt = !sawDivider && slots.length > 0 && obien.some((oi) => oi > prevReadingIndex && oi < mk.index);
      if (isAlt) slots[slots.length - 1].push(slice);
      else slots.push([slice]);
      prevReadingIndex = mk.index;
      sawDivider = false;
    } else {
      sawDivider = true; // salmo/aleluya/evangelio separan slots
      if (mk.kind === "psalm") psalm ??= slice;
      else if (mk.kind === "accl") accl ??= slice;
      else gospel ??= slice;
    }
  });
  return { slots, psalm, accl, gospel };
}

function toReadingOption(slice: string): ReadingOption {
  return { ref: refOf(slice), heading: headingOf(slice), body: bodyOf(slice) };
}

// Construye una lectura (1ª o 2ª) a partir de sus opciones: la primera arriba,
// el resto como `alternatives`.
function readingFromSlices(slices: string[] | undefined): Reading | null {
  if (!slices || !slices.length) return null;
  const [primary, ...alts] = slices.map(toReadingOption);
  return alts.length ? { ...primary, alternatives: alts } : primary;
}

function toPsalm(slice: string): Psalm {
  // Trabajamos sobre el slice SIN los bloques <p align="right"> (antífonas del
  // evangelio que pueden caer dentro cuando no hay Aleluia).
  const core = slice.replace(/<p[^>]*align="?right"?[^>]*>[\s\S]*?<\/p>/gi, "");
  const ref = refOf(slice);
  // Antífonas/respuestas: la primera es `response`; las que siguen a cada
  // "O bien:" son alternativas. El estribillo es una sola línea: los <br>
  // internos de la fuente (soft-wrap) se colapsan a espacio, si no quedaría
  // un `\n` que el <input> del form elimina y pega las palabras.
  const italics = ([...core.matchAll(/<i>([\s\S]*?)<\/i>/gi)]
    .map((m) => clean(m[1])?.replace(/\s*\n\s*/g, " "))
    .filter(Boolean)) as string[];
  const response = italics[0] ?? null;
  const obienCount = (core.match(/O\s*bien/gi) || []).length;
  const alt_responses = obienCount ? italics.slice(1, 1 + obienCount) : [];
  // Estrofas: quitar el encabezado "SALMO…ref…R.</font>" y, del inicio, las
  // antífonas <i> y los marcadores "O bien:"; el resto son las estrofas.
  let body = core.replace(/^[\s\S]*?<\/font>/i, "");
  let prev = "";
  while (body !== prev) {
    prev = body;
    body = body
      .replace(/^\s*(?:<br\s*\/?>\s*)+/i, "")
      .replace(/^\s*<i>[\s\S]*?<\/i>/i, "")
      .replace(/^\s*<font[^>]*>\s*O\s*bien\s*:?\s*<\/font>/i, "");
  }
  const stanzas = htmlToText(body)
    .split(/\n\s*\n/)
    .map((s) => s.replace(/\s*R\.?\s*$/i, "").trim()) // quita la "R." final de la estrofa
    .filter(Boolean);
  return alt_responses.length ? { ref, response, alt_responses, stanzas } : { ref, response, stanzas };
}

function parseLeccionario(html: string): Leccionario {
  const header = parseHeader(html);
  const s = splitSections(html);
  if (s.slots.length > 2) {
    console.warn(`  (aviso: ${s.slots.length} grupos de lectura en una página; se usan los 2 primeros)`);
  }
  return {
    liturgical_time: header.liturgical_time,
    day_label: header.day_label,
    first_reading: readingFromSlices(s.slots[0]),
    second_reading: readingFromSlices(s.slots[1]),
    psalm: s.psalm ? toPsalm(s.psalm) : null,
    gospel_accl: s.accl ? toReadingOption(s.accl) : null,
    gospel: s.gospel ? toReadingOption(s.gospel) : null,
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
  // (Blanco) NOMBRE"—, y (b) a veces hay DOS —"(Morado o Rosado)" o
  // "Feria (Verde) o Memoria libre (Blanco)". Recolectamos TODOS los colores y
  // los guardamos combinados ("morado o rosa", "verde o blanco"). "rosado" → "rosa".
  const found: string[] = [];
  for (const pm of text.matchAll(/\(([^)]*)\)/g)) {
    for (const cm of pm[1].toLowerCase().matchAll(/verde|rojo|rosado|rosa|blanco|morado|negro/g)) {
      const c = cm[0] === "rosado" ? "rosa" : cm[0];
      if (COLORS.has(c) && !found.includes(c)) found.push(c);
    }
  }
  const celebration =
    text.replace(/\([^)]*(?:verde|rojo|rosado|rosa|blanco|morado|negro)[^)]*\)/gi, "").replace(/\s+/g, " ").trim() ||
    null;
  return { celebration, color: found.length ? found.join(" o ") : null };
}

// -----------------------------------------------------------------------------
// Persistencia
// -----------------------------------------------------------------------------

type Row = Leccionario & {
  event_date: string;
  reading_set: string; // principal | memoria | vigilia | noche | aurora | dia | …
  celebration: string | null;
  color: string | null;
  saints: Saint[] | null; // santos del día (mismo array en todas las filas del día)
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

// Borra las filas RESIDUALES: no-locked, dentro de los meses efectivamente
// importados, cuya (event_date, reading_set) ya NO genera el parser. El upsert
// por sí solo no borra, así que sin esto quedarían colgadas filas de una
// ingesta anterior (ej. Navidad pasó de principal/memoria a noche/aurora/dia).
// Nunca toca filas `locked` (ediciones manuales) ni meses que no se importaron.
async function pruneStale(rows: Row[]) {
  if (!supabase || rows.length === 0) return;
  const genKeys = new Set(rows.map((r) => `${r.event_date}|${r.reading_set}`));
  const genMonths = new Set(rows.map((r) => r.event_date.slice(0, 7)));
  const dates = rows.map((r) => r.event_date);
  const start = dates.reduce((a, b) => (a < b ? a : b));
  const end = dates.reduce((a, b) => (a > b ? a : b));
  const { data, error } = await supabase
    .from("liturgical_readings")
    .select("id, event_date, reading_set, locked")
    .gte("event_date", start)
    .lte("event_date", end);
  if (error) {
    console.warn(`  (aviso: no se pudo hacer prune: ${error.message})`);
    return;
  }
  const stale = ((data ?? []) as { id: string; event_date: string; reading_set: string; locked: boolean }[]).filter(
    (r) =>
      !r.locked &&
      genMonths.has(r.event_date.slice(0, 7)) &&
      !genKeys.has(`${r.event_date}|${r.reading_set}`)
  );
  if (stale.length === 0) {
    console.log("  prune: sin filas residuales.");
    return;
  }
  const ids = stale.map((r) => r.id);
  for (let i = 0; i < ids.length; i += 100) {
    const { error: delErr } = await supabase
      .from("liturgical_readings")
      .delete()
      .in("id", ids.slice(i, i + 100));
    if (delErr) throw new Error(`prune delete: ${delErr.message}`);
  }
  console.log(
    `  prune: ${stale.length} fila(s) residual(es) borrada(s): ` +
      stale.map((r) => `${r.event_date}/${r.reading_set}`).join(", ")
  );
}

function printSample(rows: Row[]) {
  if (!rows.length) return;
  console.log("\n--- resumen por fila ---");
  for (const r of rows) {
    const sec = [
      r.first_reading ? (r.first_reading.alternatives?.length ? "L1+" : "L1 ") : "-- ",
      r.psalm ? (r.psalm.alt_responses?.length ? "Sal+" : "Sal ") : "--- ",
      r.second_reading ? (r.second_reading.alternatives?.length ? "L2+" : "L2 ") : "-- ",
      r.gospel_accl ? "Al" : "--",
      r.gospel ? "Ev" : "--",
    ].join(" ");
    const santos = r.saints?.length ? ` · ${r.saints.length} santo(s)` : "";
    console.log(
      `${r.event_date} ${r.reading_set.padEnd(10)} ${(r.color ?? "?").padEnd(16)} [${sec}] ${(r.liturgical_time ?? "").slice(0, 30)}${santos}`
    );
  }
  // Muestra completa: preferimos una fila con santos, alternativas o alt_responses.
  const interesting =
    rows.find((r) => r.saints?.length) ??
    rows.find((r) => r.first_reading?.alternatives?.length || r.psalm?.alt_responses?.length) ??
    rows[0];
  console.log("\n--- muestra completa ---");
  console.log(JSON.stringify(interesting, null, 2).slice(0, 2800));
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

async function main() {
  console.log(
    `Año: ${YEAR} · Modo: ${APPLY ? "APPLY (escribe)" : "DRY-RUN"}` +
      `${ONLY_MONTH ? ` · mes ${ONLY_MONTH}` : ""}${LIMIT ? ` · limit ${LIMIT}` : ""}` +
      `${REFRESH ? " · refresh (ignora caché)" : ""}`
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
      const event_date = `${YEAR}-${pad(month)}-${pad(d.day)}`;
      // Santos del día (se replican en cada fila del día). Solo si hay lecturas.
      const saints =
        d.sets.length && d.saints.length ? await resolveSaints(d.saints, htmCache, month, d.day) : [];
      for (const s of d.sets) {
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
          celebration: s.celebration,
          color: s.color,
          saints: saints.length ? saints : null,
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
  if (NO_PRUNE) console.log("  (prune desactivado con --no-prune)");
  else if (LIMIT) console.log("  (prune omitido: corrida parcial con --limit)");
  else await pruneStale(rows);
  console.log("Listo.");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
