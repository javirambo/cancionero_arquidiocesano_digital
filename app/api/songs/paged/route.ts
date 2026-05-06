import { NextResponse } from "next/server";
import { listSongsPaged, listSongsWithCapabilities } from "@/lib/songs";

const PAGE_SIZE = 50;
const SEARCH_LIMIT = 100;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q) {
    const items = await listSongsWithCapabilities(q, SEARCH_LIMIT);
    return NextResponse.json({
      items,
      total: items.length,
      page: 1,
      pageSize: items.length,
      query: q,
    });
  }
  const page = Math.max(1, Number(url.searchParams.get("p")) || 1);
  const result = await listSongsPaged(page, PAGE_SIZE);
  return NextResponse.json({ ...result, page, pageSize: PAGE_SIZE });
}
