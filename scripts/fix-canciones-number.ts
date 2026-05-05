/**
 * Actualiza songs.number para las canciones ya importadas desde el backup
 * de Turso. Matchea por title (case-insensitive) y solo escribe cuando
 * songs.number es NULL.
 *
 * Uso:
 *   npx tsx scripts/fix-canciones-number.ts          # dry-run (default)
 *   npx tsx scripts/fix-canciones-number.ts --apply  # escribe en la BD
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const BACKUP_PATH = "canciones.temp/backup-turso-2026-03-02.sql";
const APPLY = process.argv.includes("--apply");

function loadDotEnv(path: string) {
  try {
    const txt = readFileSync(path, "utf8");
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      const k = m[1];
      let v = m[2];
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    /* ignore */
  }
}
loadDotEnv(resolve(process.cwd(), ".env.local"));

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// -----------------------------------------------------------------------------
// Reutilizamos el parser y decoder del script original (copia mínima)
// -----------------------------------------------------------------------------

function readSqlString(src: string, start: number): { value: string; end: number } {
  if (src[start] !== "'") throw new Error(`Esperaba ' en pos ${start}`);
  let i = start + 1;
  let out = "";
  while (i < src.length) {
    const ch = src[i];
    if (ch === "'") {
      if (src[i + 1] === "'") {
        out += "'";
        i += 2;
        continue;
      }
      return { value: out, end: i + 1 };
    }
    out += ch;
    i++;
  }
  throw new Error(`Cadena SQL sin cerrar desde pos ${start}`);
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", shy: "",
  iexcl: "¡", iquest: "¿", laquo: "«", raquo: "»",
  ntilde: "ñ", Ntilde: "Ñ",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú",
  ouml: "ö", uuml: "ü",
};

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (full, name) =>
      NAMED_ENTITIES[name] !== undefined ? NAMED_ENTITIES[name] : full
    );
}

type BackupRow = { id: number; titulo: string };

function parseDump(sql: string): BackupRow[] {
  const rows: BackupRow[] = [];
  const stmtRe = /INSERT INTO Canciones \(id, titulo, letra, grupo, extras\) VALUES\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = stmtRe.exec(sql)) !== null) {
    let i = m.index + m[0].length;
    const idMatch = sql.slice(i).match(/^\s*(\d+)\s*,\s*/);
    if (!idMatch) throw new Error(`No pude leer id en pos ${i}`);
    const id = parseInt(idMatch[1], 10);
    i += idMatch[0].length;
    const titulo = readSqlString(sql, i);
    rows.push({ id, titulo: decodeHtmlEntities(titulo.value).trim() });
  }
  return rows;
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

async function main() {
  console.log(`Modo: ${APPLY ? "APPLY (escribe en BD)" : "DRY-RUN (no escribe)"}`);

  const sql = readFileSync(resolve(process.cwd(), BACKUP_PATH), "utf8");
  const backup = parseDump(sql);
  console.log(`Filas en backup: ${backup.length}`);

  // Traer todas las canciones existentes con su title y number actual.
  const { data: songs, error } = await supabase
    .from("songs")
    .select("id, title, number");
  if (error) throw error;
  console.log(`Canciones en BD: ${songs?.length ?? 0}`);

  // Index por lower(title) → fila
  const byTitle = new Map<string, { id: string; title: string; number: number | null }>();
  for (const s of songs ?? []) {
    byTitle.set((s.title as string).toLowerCase(), {
      id: s.id as string,
      title: s.title as string,
      number: s.number as number | null,
    });
  }

  let updated = 0;
  let alreadyHadNumber = 0;
  let notFound = 0;
  let conflicts = 0;
  const errors: { id: number; titulo: string; error: string }[] = [];

  // Detectar conflictos antes de escribir: si dos canciones del backup matchean al mismo title, o
  // si el number que vamos a poner ya está ocupado por OTRA canción.
  const numbersInUse = new Map<number, string>(); // number → song.id
  for (const s of songs ?? []) {
    if (s.number !== null) numbersInUse.set(s.number as number, s.id as string);
  }

  for (const row of backup) {
    const key = row.titulo.toLowerCase();
    const song = byTitle.get(key);
    if (!song) {
      notFound++;
      continue;
    }
    if (song.number !== null) {
      alreadyHadNumber++;
      continue;
    }
    // ¿El number ya lo tiene otra canción?
    const occupiedBy = numbersInUse.get(row.id);
    if (occupiedBy && occupiedBy !== song.id) {
      conflicts++;
      errors.push({
        id: row.id,
        titulo: row.titulo,
        error: `number ${row.id} ya está ocupado por otra canción (${occupiedBy})`,
      });
      continue;
    }

    if (!APPLY) {
      updated++;
      numbersInUse.set(row.id, song.id);
      continue;
    }

    const { error: upErr } = await supabase
      .from("songs")
      .update({ number: row.id })
      .eq("id", song.id);
    if (upErr) {
      errors.push({ id: row.id, titulo: row.titulo, error: upErr.message });
      continue;
    }
    numbersInUse.set(row.id, song.id);
    updated++;
  }

  console.log("\n=== RESUMEN ===");
  console.log(`Filas backup:              ${backup.length}`);
  console.log(`Actualizadas (number):     ${updated}`);
  console.log(`Ya tenían number:          ${alreadyHadNumber}`);
  console.log(`No encontradas en BD:      ${notFound}`);
  console.log(`Conflictos de number:      ${conflicts}`);
  console.log(`Errores:                   ${errors.length}`);
  if (errors.length > 0) {
    console.log("\nErrores:");
    for (const e of errors.slice(0, 30)) {
      console.log(`  [${e.id}] ${e.titulo}: ${e.error}`);
    }
    if (errors.length > 30) console.log(`  ...y ${errors.length - 30} más`);
  }
  if (!APPLY) {
    console.log("\n(DRY-RUN: no se escribió nada. Volvé a correr con --apply para aplicar.)");
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
