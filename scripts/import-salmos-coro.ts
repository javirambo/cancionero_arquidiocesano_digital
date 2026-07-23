/**
 * Importa el catálogo de Salmos Responsoriales del Coro San Clemente a la
 * tabla `salmos` (migraciones 0058 + 0059).
 *
 * Un salmo (antífona) puede tener VARIAS versiones de audio y VARIAS
 * partituras (Simple / SATB). El sitio las publica como filas separadas
 * (slug, slug2, slug3…) y la antífona base trae marcadores "- (2) - (3) -".
 * Este script:
 *   1. Baja la lista y AGRUPA las filas por (nº de salmo + antífona limpia).
 *   2. Por grupo arma: audios[] (una por versión, mp3 derivable del slug) y
 *      scores[] (leyendo la página de detalle del base → partitura Simple +
 *      SATB, cuyos nombres no son derivables).
 *   3. Sube todo al bucket `images` (carpeta `salmos/`) y hace upsert de UN
 *      salmo por grupo, con `audios`/`scores` (jsonb [{label, path}]).
 *   4. Con --link, vincula salmo_id en liturgical_readings por match.
 *
 * Fuente: https://www.corosanclemente.com.ar/Part/Responsoriales/SR_Numerico.php
 *
 * Uso:
 *   npx tsx scripts/import-salmos-coro.ts                 # dry-run (agrupa, no baja)
 *   npx tsx scripts/import-salmos-coro.ts --apply         # baja media + upsert
 *   npx tsx scripts/import-salmos-coro.ts --apply --link  # + vincula salmo_id
 *   npx tsx scripts/import-salmos-coro.ts --link          # solo re-vincular
 *   npx tsx scripts/import-salmos-coro.ts --ref-only --apply  # backfill de salmos.ref
 *                                                             # (versículos, NO toca media)
 *
 * Requiere en .env.local: SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) y
 * SUPABASE_SERVICE_ROLE_KEY.
 *
 * ⚖️ Derechos: audios y partituras son obra del Coro San Clemente.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { looseKey, normalizeResponse, psalmNumberFromRef } from "../lib/salmos";

const BASE = "https://www.corosanclemente.com.ar/Part/Responsoriales/";
const LIST_URL = `${BASE}SR_Numerico.php`;
const UA = "cancionero-arquidiocesano-import/1.0";
const THROTTLE_MS = 300;

const ARGS = process.argv.slice(2);
const APPLY = ARGS.includes("--apply");
const LINK = ARGS.includes("--link");
// Backfill de solo `salmos.ref` (versículos, del detalle) sin tocar media.
const REF_ONLY = ARGS.includes("--ref-only");

function loadDotEnv(path: string) {
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
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
if ((APPLY || LINK) && (!SUPABASE_URL || !SERVICE_KEY)) {
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
async function throttle() {
  const wait = THROTTLE_MS - (Date.now() - lastFetch);
  if (wait > 0) await sleep(wait);
  lastFetch = Date.now();
}
async function fetchText(url: string): Promise<string> {
  await throttle();
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}
async function fetchBytes(url: string): Promise<{ bytes: Uint8Array; type: string }> {
  await throttle();
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return {
    bytes: new Uint8Array(await res.arrayBuffer()),
    type: res.headers.get("content-type") || "application/octet-stream",
  };
}

// -----------------------------------------------------------------------------
// Parsing
// -----------------------------------------------------------------------------

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  ntilde: "ñ", Ntilde: "Ñ",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", uuml: "ü",
};
function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-zA-Z]+);/g, (full, n) => (NAMED[n] !== undefined ? NAMED[n] : full));
}

// Antífona para mostrar: saca los marcadores de versión "- (2) -", "(3)" y los
// guiones sueltos del final. Mantiene tildes/mayúsculas.
function cleanResponse(s: string): string {
  return s
    .replace(/\(\s*\d+\s*\)/g, " ")
    .replace(/-\s*\d+\s*-/g, " ")
    .replace(/(?:\s*-\s*)+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Una fila = un salmo (antífona), con 1..N versiones: la fila trae varios
// links .php y varios audio/*.mp3 (uno por versión).
type CatalogEntry = { psalm_number: number; slug: string; response: string; audioSlugs: string[] };

function parseCatalog(html: string): CatalogEntry[] {
  const rows = html.match(/<tr\b[\s\S]*?<\/tr>/gi) ?? [];
  const out: CatalogEntry[] = [];
  for (const r of rows) {
    const php = r.match(/href="(SR_(\d+)_[^"]+)\.php"/i);
    if (!php) continue;
    const slug = php[1];
    const psalm_number = Number(php[2]);
    const audioSlugs = [...r.matchAll(/href="audio\/(SR_[^"]+)\.mp3"/gi)].map((m) => m[1]);
    const raw = decodeEntities(r.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    const response = cleanResponse(raw.replace(new RegExp("^" + psalm_number + "\\s+"), "").trim());
    if (response) {
      out.push({
        psalm_number,
        slug,
        response,
        audioSlugs: audioSlugs.length ? audioSlugs : [slug],
      });
    }
  }
  return out;
}

// Partituras de una página de detalle (relativas): imagenes/*.gif|png|jpg|pdf,
// excluyendo íconos/fondos.
function parseScoresFromDetail(html: string): string[] {
  const urls: string[] = [];
  for (const m of html.matchAll(/(?:src|href)="(imagenes\/[^"]+\.(?:gif|png|jpe?g|pdf))"/gi)) {
    const u = m[1];
    if (/sound|fondo|logo|boton|menu|flecha|icono/i.test(u)) continue;
    urls.push(u);
  }
  return [...new Set(urls)];
}

function sanitizeName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
}

// Cita de versículos de la página de detalle. La tabla muestra
// "SALMO <nº>, <versículos>" (ej. "SALMO 66, 2-3.5-6.8"). Se normaliza a
// "Sal 66, 2-3.5-6.8" (mismo formato que liturgical_readings.psalm.ref).
// Devuelve null si no hay número. Ver documentacion/calendario-liturgico-y-lecturas.md §5.
function parseRefFromDetail(html: string): string | null {
  const text = decodeEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
  const m = text.match(/SALMO\s+(\d+)\s*(?:,\s*([\d][\d.,;\s-]*?)(?=[^\d.,;\s-]|$))?/i);
  if (!m) return null;
  const verses = (m[2] ?? "").replace(/\s+/g, "").replace(/[.,;-]+$/, "");
  return verses ? `Sal ${m[1]}, ${verses}` : `Sal ${m[1]}`;
}

// -----------------------------------------------------------------------------
// Storage
// -----------------------------------------------------------------------------

const inStorage = new Set<string>();
let uploaded = 0;
let failed = 0;

async function ensureFile(storagePath: string, remoteUrl: string): Promise<boolean> {
  if (inStorage.has(storagePath)) return true;
  if (!supabase) return false;
  try {
    const { bytes, type } = await fetchBytes(remoteUrl);
    const { error } = await supabase.storage
      .from("images")
      .upload(storagePath, bytes, { upsert: true, contentType: type });
    if (error) throw new Error(error.message);
    inStorage.add(storagePath);
    uploaded++;
    return true;
  } catch (err) {
    failed++;
    console.warn(`  ${storagePath}: ${(err as Error).message}`);
    return false;
  }
}

type MediaItem = { label: string; path: string };
type SalmoRow = {
  psalm_number: number;
  ref: string | null;
  response: string;
  response_norm: string;
  source: "coro_san_clemente";
  source_slug: string;
  audios: MediaItem[];
  scores: MediaItem[];
};

async function upsertSalmos(rows: SalmoRow[]) {
  if (!supabase) throw new Error("Sin cliente Supabase");
  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from("salmos").upsert(chunk, { onConflict: "source_slug" });
    if (error) throw new Error(`upsert salmos ${i}: ${error.message}`);
    console.log(`  upsert ${i + chunk.length}/${rows.length}`);
  }
}

// -----------------------------------------------------------------------------
// Link salmo_id (match flexible por nº + antífona)
// -----------------------------------------------------------------------------

const tokenSet = (s: string) => new Set(s.split(" ").filter(Boolean));
function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

async function linkSalmoIds() {
  if (!supabase) throw new Error("Sin cliente Supabase");
  const { data: salmos, error: e1 } = await supabase
    .from("salmos")
    .select("id, psalm_number, response");
  if (e1) throw new Error(e1.message);
  const byNum = new Map<number, { id: string; key: string; toks: Set<string> }[]>();
  for (const s of salmos ?? []) {
    const key = looseKey(s.response as string);
    const arr = byNum.get(s.psalm_number as number) ?? [];
    arr.push({ id: s.id as string, key, toks: tokenSet(key) });
    byNum.set(s.psalm_number as number, arr);
  }

  const { data: rows, error: e2 } = await supabase
    .from("liturgical_readings")
    .select("id, psalm")
    .is("salmo_id", null);
  if (e2) throw new Error(e2.message);

  let exact = 0;
  let fuzzy = 0;
  for (const r of rows ?? []) {
    const psalm = r.psalm as { ref?: string; response?: string } | null;
    if (!psalm) continue;
    const num = psalmNumberFromRef(psalm.ref);
    if (num == null) continue;
    const cands = byNum.get(num);
    if (!cands) continue;
    const key = looseKey(psalm.response);
    const toks = tokenSet(key);
    let best = cands.find((c) => c.key === key) ?? null;
    let isFuzzy = false;
    if (!best) {
      let bestScore = 0;
      for (const c of cands) {
        const sc = jaccard(toks, c.toks);
        if (sc > bestScore) {
          bestScore = sc;
          best = c;
        }
      }
      if (best && bestScore >= 0.72) isFuzzy = true;
      else best = null;
    }
    if (!best) continue;
    if (isFuzzy) fuzzy++;
    else exact++;
    if (APPLY) {
      const { error } = await supabase
        .from("liturgical_readings")
        .update({ salmo_id: best.id })
        .eq("id", r.id);
      if (error) throw new Error(`link ${r.id}: ${error.message}`);
    }
  }
  console.log(
    `Link: fechas sin salmo ${rows?.length ?? 0} · matcheadas ${exact + fuzzy}` +
      ` (exactas ${exact}, difusas ${fuzzy})${APPLY ? "" : " (dry-run: no escribió)"}`
  );
}

// -----------------------------------------------------------------------------
// Backfill de solo `salmos.ref` (versículos). NO toca media, response ni
// salmo_id: hace UPDATE de la columna ref por source_slug. Idempotente.
// -----------------------------------------------------------------------------

async function backfillRefs(catalog: CatalogEntry[]) {
  let conRef = 0;
  let sinRef = 0;
  let updated = 0;
  let failed = 0;
  for (const e of catalog) {
    let detail: string | null = null;
    try {
      detail = await fetchText(`${BASE}${e.slug}.php`);
    } catch {
      detail = null;
    }
    const ref = detail ? parseRefFromDetail(detail) : null;
    if (!ref) {
      sinRef++;
      continue;
    }
    conRef++;
    if (APPLY && supabase) {
      const { error } = await supabase
        .from("salmos")
        .update({ ref })
        .eq("source_slug", e.audioSlugs[0]);
      if (error) {
        failed++;
        console.warn(`  ${e.slug}: ${error.message}`);
        continue;
      }
      updated++;
    }
  }
  console.log(
    `Backfill ref: con ref ${conRef} · sin ref ${sinRef}` +
      (APPLY ? ` · actualizados ${updated} · fallidos ${failed}` : " (dry-run: no escribió)")
  );
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

async function main() {
  console.log(
    `Modo: ${APPLY ? "APPLY (escribe)" : "DRY-RUN"}${REF_ONLY ? " + REF-ONLY" : ""}${LINK ? " + LINK" : ""}`
  );

  if (REF_ONLY) {
    console.log(`Bajando catálogo: ${LIST_URL}`);
    const catalog = parseCatalog(await fetchText(LIST_URL));
    console.log(`Salmos en el catálogo: ${catalog.length}`);
    await backfillRefs(catalog);
    console.log(APPLY ? "Listo." : "\n(DRY-RUN: no escribió. Usá --apply para persistir ref.)");
    return;
  }

  if (!(LINK && !APPLY)) {
    console.log(`Bajando catálogo: ${LIST_URL}`);
    const html = await fetchText(LIST_URL);
    const catalog = parseCatalog(html);
    console.log(`Salmos en el catálogo: ${catalog.length}`);

    if (APPLY && supabase) {
      const { data } = await supabase.storage.from("images").list("salmos", { limit: 4000 });
      for (const f of data ?? []) inStorage.add(`salmos/${f.name}`);
    }

    const rows: SalmoRow[] = [];
    for (const e of catalog) {
      const audios: MediaItem[] = [];
      const scores: MediaItem[] = [];

      // Audios: uno por versión (todos los mp3 de la fila).
      for (let i = 0; i < e.audioSlugs.length; i++) {
        const as = e.audioSlugs[i];
        const path = `salmos/${as}.mp3`;
        const label = e.audioSlugs.length > 1 ? `Versión ${i + 1}` : "Audio";
        if (!APPLY) audios.push({ label, path });
        else if (await ensureFile(path, `${BASE}audio/${as}.mp3`)) audios.push({ label, path });
      }

      // Partituras + versículos: de la página de detalle — solo en --apply.
      let ref: string | null = null;
      if (APPLY) {
        let detail: string | null = null;
        try {
          detail = await fetchText(`${BASE}${e.slug}.php`);
        } catch {
          detail = null;
        }
        if (detail) {
          ref = parseRefFromDetail(detail);
          for (const rel of parseScoresFromDetail(detail)) {
            const fname = sanitizeName(decodeURIComponent(rel.split("/").pop() ?? ""));
            const path = `salmos/${fname}`;
            if (await ensureFile(path, `${BASE}${rel}`)) {
              scores.push({ label: /satb/i.test(fname) ? "SATB" : "Simple", path });
            }
          }
        }
      }

      rows.push({
        psalm_number: e.psalm_number,
        ref,
        response: e.response,
        response_norm: normalizeResponse(e.response),
        source: "coro_san_clemente",
        source_slug: e.audioSlugs[0],
        audios,
        scores,
      });
    }

    console.log(
      `\nPreparados: ${rows.length} salmos` +
        (APPLY ? ` · archivos subidos ${uploaded} · fallidos ${failed}` : "")
    );
    console.log("Muestra:", JSON.stringify(rows.find((r) => r.audios.length > 1) ?? rows[0], null, 1));

    if (APPLY && rows.length) await upsertSalmos(rows);
  }

  if (LINK) await linkSalmoIds();

  if (!APPLY && !LINK) console.log("\n(DRY-RUN: no se bajó ni escribió. Usá --apply.)");
  else if (APPLY) console.log("Listo.");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
