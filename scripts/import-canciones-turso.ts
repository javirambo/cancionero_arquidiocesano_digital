/**
 * Importa canciones desde el dump SQL de Turso al esquema nuevo en Supabase.
 *
 * Uso:
 *   npx tsx scripts/import-canciones-turso.ts          # dry-run (default)
 *   npx tsx scripts/import-canciones-turso.ts --apply  # escribe en la BD
 *
 * Origen: canciones.temp/backup-turso-2026-03-02.sql
 *   tabla Canciones(id, titulo, letra (JSON [{c,l}]), grupo, extras (JSON {youtube_url,autor}))
 *
 * Destino: public.songs / categories / authors
 *   - body: ChordPro inline ([Acorde]letra)
 *   - status: 'published'
 *   - created_by: CREATED_BY_USER (constante)
 *   - duplicado por title (lower) → skip
 *   - categoría faltante → crea
 *   - autor faltante → crea
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

// -----------------------------------------------------------------------------
// Configuración
// -----------------------------------------------------------------------------

const CREATED_BY_USER = "c53acd8d-5105-4be9-b09b-ccab0b951640";
const BACKUP_PATH = "canciones.temp/backup-turso-2026-03-02.sql";

const APPLY = process.argv.includes("--apply");

// .env.local — leer manual (no metemos dotenv como dep)
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
// Parsing del dump SQL
// -----------------------------------------------------------------------------

type Row = {
  id: number;
  titulo: string;
  letra: string; // JSON crudo (string literal SQL ya unescapeado)
  grupo: string | null;
  extras: string | null;
};

/**
 * Lee un literal de cadena SQL desde la posición `start` (debe apuntar a la `'` inicial).
 * Devuelve { value, end } donde `end` es el índice del caracter justo después de la `'` final.
 * Maneja `''` como escape de comilla simple.
 */
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

function parseDump(sql: string): Row[] {
  const rows: Row[] = [];
  const stmtRe = /INSERT INTO Canciones \(id, titulo, letra, grupo, extras\) VALUES\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = stmtRe.exec(sql)) !== null) {
    let i = m.index + m[0].length;
    // id
    const idMatch = sql.slice(i).match(/^\s*(\d+)\s*,\s*/);
    if (!idMatch) throw new Error(`No pude leer id en pos ${i}`);
    const id = parseInt(idMatch[1], 10);
    i += idMatch[0].length;
    // titulo (string)
    const titulo = readSqlString(sql, i);
    i = titulo.end;
    i += sql.slice(i).match(/^\s*,\s*/)![0].length;
    // letra (string)
    const letra = readSqlString(sql, i);
    i = letra.end;
    i += sql.slice(i).match(/^\s*,\s*/)![0].length;
    // grupo (string o NULL)
    let grupo: string | null = null;
    if (sql[i] === "'") {
      const r = readSqlString(sql, i);
      grupo = r.value;
      i = r.end;
    } else {
      const nullMatch = sql.slice(i).match(/^NULL/);
      if (!nullMatch) throw new Error(`Esperaba NULL o string en grupo, pos ${i}`);
      i += 4;
    }
    i += sql.slice(i).match(/^\s*,\s*/)![0].length;
    // extras (string o NULL)
    let extras: string | null = null;
    if (sql[i] === "'") {
      const r = readSqlString(sql, i);
      extras = r.value;
      i = r.end;
    } else {
      const nullMatch = sql.slice(i).match(/^NULL/);
      if (!nullMatch) throw new Error(`Esperaba NULL o string en extras, pos ${i}`);
      i += 4;
    }
    rows.push({ id, titulo: titulo.value, letra: letra.value, grupo, extras });
  }
  return rows;
}

// -----------------------------------------------------------------------------
// Limpieza de texto
// -----------------------------------------------------------------------------

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  shy: "", // soft hyphen — quitar
  iexcl: "¡",
  iquest: "¿",
  laquo: "«",
  raquo: "»",
  ntilde: "ñ",
  Ntilde: "Ñ",
  aacute: "á",
  eacute: "é",
  iacute: "í",
  oacute: "ó",
  uacute: "ú",
  Aacute: "Á",
  Eacute: "É",
  Iacute: "Í",
  Oacute: "Ó",
  Uacute: "Ú",
  ouml: "ö",
  uuml: "ü",
};

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (full, name) =>
      NAMED_ENTITIES[name] !== undefined ? NAMED_ENTITIES[name] : full
    );
}

// -----------------------------------------------------------------------------
// Conversión letra (JSON [{c,l}]) → ChordPro inline
// -----------------------------------------------------------------------------

type Verse = { c: string; l: string };

function letraToChordPro(letraJson: string): string {
  let arr: Verse[];
  try {
    arr = JSON.parse(letraJson) as Verse[];
  } catch (e) {
    throw new Error(`JSON inválido en letra: ${(e as Error).message}`);
  }
  const lines: string[] = [];
  for (const { c, l } of arr) {
    const lyric = decodeHtmlEntities(l ?? "");
    const chordRow = c ?? "";
    if (!chordRow.trim()) {
      lines.push(lyric);
      continue;
    }
    // Encontrar acordes con su columna en `chordRow`.
    const tokens: { chord: string; col: number }[] = [];
    const re = /\S+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(chordRow)) !== null) {
      tokens.push({ chord: m[0], col: m.index });
    }
    // Insertar de derecha a izquierda en la letra para no desplazar índices.
    let out = lyric;
    for (let i = tokens.length - 1; i >= 0; i--) {
      const { chord, col } = tokens[i];
      if (col >= out.length) {
        // Padding con espacios si el acorde cae más allá del final de la letra.
        out = out + " ".repeat(col - out.length) + `[${chord}]`;
      } else {
        out = out.slice(0, col) + `[${chord}]` + out.slice(col);
      }
    }
    lines.push(out);
  }
  return lines.join("\n");
}

// -----------------------------------------------------------------------------
// Slug
// -----------------------------------------------------------------------------

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "cancion";
}

// -----------------------------------------------------------------------------
// Categorías y autores: cache + create-on-miss
// -----------------------------------------------------------------------------

const categoryCache = new Map<string, string>(); // lower(name) → id
const authorCache = new Map<string, string>(); // lower(name) → id
let categoriesCreated = 0;
let authorsCreated = 0;

async function loadCategoryCache() {
  const { data, error } = await supabase.from("categories").select("id, name");
  if (error) throw error;
  for (const r of data ?? []) {
    categoryCache.set((r.name as string).toLowerCase(), r.id as string);
  }
}

async function loadAuthorCache() {
  const { data, error } = await supabase.from("authors").select("id, name");
  if (error) throw error;
  for (const r of data ?? []) {
    authorCache.set((r.name as string).toLowerCase(), r.id as string);
  }
}

function capitalize(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

async function getOrCreateCategory(name: string | null): Promise<string | null> {
  if (!name || !name.trim()) return null;
  const cleanName = capitalize(name.trim());
  const key = cleanName.toLowerCase();
  if (categoryCache.has(key)) return categoryCache.get(key)!;
  if (!APPLY) {
    categoryCache.set(key, "DRY-RUN-NEW-CAT");
    categoriesCreated++;
    return "DRY-RUN-NEW-CAT";
  }
  const slug = slugify(cleanName);
  const { data, error } = await supabase
    .from("categories")
    .insert({ name: cleanName, slug })
    .select("id")
    .single();
  if (error) throw new Error(`Crear categoría "${cleanName}": ${error.message}`);
  const id = data.id as string;
  categoryCache.set(key, id);
  categoriesCreated++;
  return id;
}

async function getOrCreateAuthor(name: string | null): Promise<string | null> {
  if (!name || !name.trim()) return null;
  const clean = name.trim();
  const key = clean.toLowerCase();
  if (authorCache.has(key)) return authorCache.get(key)!;
  if (!APPLY) {
    authorCache.set(key, "DRY-RUN-NEW-AUTHOR");
    authorsCreated++;
    return "DRY-RUN-NEW-AUTHOR";
  }
  const { data, error } = await supabase
    .from("authors")
    .insert({ name: clean })
    .select("id")
    .single();
  if (error) throw new Error(`Crear autor "${clean}": ${error.message}`);
  const id = data.id as string;
  authorCache.set(key, id);
  authorsCreated++;
  return id;
}

// -----------------------------------------------------------------------------
// Duplicados de songs por title (lower)
// -----------------------------------------------------------------------------

const existingTitles = new Set<string>();
const existingSlugs = new Set<string>();

async function loadExistingSongs() {
  const { data, error } = await supabase.from("songs").select("title, slug");
  if (error) throw error;
  for (const r of data ?? []) {
    existingTitles.add((r.title as string).toLowerCase());
    existingSlugs.add(r.slug as string);
  }
}

function uniqueSlug(base: string): string {
  if (!existingSlugs.has(base)) return base;
  let n = 2;
  while (existingSlugs.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

async function main() {
  console.log(`Modo: ${APPLY ? "APPLY (escribe en BD)" : "DRY-RUN (no escribe)"}`);
  console.log(`Backup: ${BACKUP_PATH}`);

  const sql = readFileSync(resolve(process.cwd(), BACKUP_PATH), "utf8");
  const rows = parseDump(sql);
  console.log(`Filas parseadas: ${rows.length}`);

  await loadCategoryCache();
  await loadAuthorCache();
  await loadExistingSongs();
  console.log(
    `Estado actual BD: ${categoryCache.size} categorías, ${authorCache.size} autores, ${existingTitles.size} canciones`
  );

  let inserted = 0;
  let skippedDup = 0;
  const errors: { id: number; titulo: string; error: string }[] = [];

  for (const row of rows) {
    try {
      const titulo = decodeHtmlEntities(row.titulo).trim();
      const titleKey = titulo.toLowerCase();
      if (existingTitles.has(titleKey)) {
        skippedDup++;
        continue;
      }

      const body = letraToChordPro(row.letra);

      let youtube_url: string | null = null;
      let autor: string | null = null;
      if (row.extras) {
        try {
          const ex = JSON.parse(row.extras) as { youtube_url?: string; autor?: string };
          youtube_url = ex.youtube_url && ex.youtube_url.trim() ? ex.youtube_url.trim() : null;
          autor = ex.autor && ex.autor.trim() ? ex.autor.trim() : null;
        } catch {
          /* ignorar extras inválidos */
        }
      }

      const category_id = await getOrCreateCategory(row.grupo);
      const author_id = await getOrCreateAuthor(autor);
      const slug = uniqueSlug(slugify(titulo));

      const songRow = {
        number: row.id,
        title: titulo,
        slug,
        body,
        category_id: APPLY ? category_id : null,
        author_id: APPLY ? author_id : null,
        youtube_url,
        status: "published" as const,
        current_version: 1,
        created_by: CREATED_BY_USER,
        published_at: new Date().toISOString(),
      };

      if (!APPLY) {
        existingTitles.add(titleKey);
        existingSlugs.add(slug);
        inserted++;
        continue;
      }

      const { error } = await supabase.from("songs").insert(songRow);
      if (error) throw new Error(error.message);
      existingTitles.add(titleKey);
      existingSlugs.add(slug);
      inserted++;
    } catch (e) {
      errors.push({
        id: row.id,
        titulo: row.titulo,
        error: (e as Error).message,
      });
    }
  }

  console.log("\n=== RESUMEN ===");
  console.log(`Leídas:                  ${rows.length}`);
  console.log(`Insertadas:              ${inserted}`);
  console.log(`Saltadas (duplicado):    ${skippedDup}`);
  console.log(`Categorías creadas:      ${categoriesCreated}`);
  console.log(`Autores creados:         ${authorsCreated}`);
  console.log(`Errores:                 ${errors.length}`);
  if (errors.length > 0) {
    console.log("\nErrores:");
    for (const e of errors.slice(0, 20)) {
      console.log(`  [${e.id}] ${e.titulo}: ${e.error}`);
    }
    if (errors.length > 20) console.log(`  ...y ${errors.length - 20} más`);
  }
  if (!APPLY) {
    console.log("\n(DRY-RUN: no se escribió nada. Volvé a correr con --apply para aplicar.)");
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
