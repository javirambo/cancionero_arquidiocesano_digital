import { NextResponse, type NextRequest } from "next/server";
import { searchSongs } from "@/lib/songs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  if (q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }
  try {
    const results = await searchSongs(q, 25);
    return NextResponse.json({ results });
  } catch (err) {
    console.error("[songs/buscar]", err);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
