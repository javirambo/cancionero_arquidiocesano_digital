import { NextResponse } from "next/server";
import { listSongsPaged, listSongsWithCapabilities } from "@/lib/songs";

const PAGE_SIZE = 50;
const SEARCH_LIMIT = 100;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const cats = url.searchParams
    .getAll("cat")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (q) {
    const items = await listSongsWithCapabilities(q, SEARCH_LIMIT, cats);
    return NextResponse.json({
      items,
      total: items.length,
      page: 1,
      pageSize: items.length,
      query: q,
    });
  }
  const page = Math.max(1, Number(url.searchParams.get("p")) || 1);
  const result = await listSongsPaged(page, PAGE_SIZE, cats);
  return NextResponse.json({ ...result, page, pageSize: PAGE_SIZE });
}
