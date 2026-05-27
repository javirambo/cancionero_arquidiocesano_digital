import { NextRequest } from "next/server";
import { getAdminAccess } from "../../access";
import {
  listSongsForAdmin,
  type AdminSongsOrden,
  type SongStatus,
} from "@/lib/songs-admin";
import { formatearFecha, hoyEnCordoba } from "@/lib/dates";

type EstadoFiltro = SongStatus | "todas";

const ESTADOS_VALIDOS = new Set<EstadoFiltro>([
  "todas",
  "draft",
  "review",
  "published",
  "archived",
]);
const ORDENES_VALIDOS = new Set<AdminSongsOrden>([
  "modificacion",
  "numero",
  "nombre",
]);

const STATUS_LABEL: Record<SongStatus, string> = {
  draft: "Borrador",
  review: "Revisión",
  published: "Pública",
  archived: "Papelera",
};

const BOM_UTF8 = "﻿";

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[";\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(request: NextRequest) {
  const access = await getAdminAccess();
  if (!access.isAdmin && !access.isEditor) {
    return new Response("Forbidden", { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const q = sp.get("q") ?? "";
  const estadoParam = sp.get("estado") ?? "todas";
  const ordenParam = sp.get("orden") ?? "modificacion";
  const estado: EstadoFiltro = ESTADOS_VALIDOS.has(estadoParam as EstadoFiltro)
    ? (estadoParam as EstadoFiltro)
    : "todas";
  const orden: AdminSongsOrden = ORDENES_VALIDOS.has(
    ordenParam as AdminSongsOrden,
  )
    ? (ordenParam as AdminSongsOrden)
    : "modificacion";

  const songs = await listSongsForAdmin(q, estado, orden, 10000);

  const headers = [
    "Número",
    "Título",
    "Estado",
    "Categoría",
    "Autor",
    "Modificada",
  ];
  const rows = songs.map((s) => [
    s.number ?? "",
    s.title,
    STATUS_LABEL[s.status],
    s.category ?? "",
    s.author ?? "",
    formatearFecha(s.updated_at),
  ]);

  const csv =
    BOM_UTF8 +
    [headers, ...rows]
      .map((r) => r.map(csvEscape).join(";"))
      .join("\r\n");

  const filename = `cantos-${hoyEnCordoba()}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
