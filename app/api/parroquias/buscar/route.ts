import { NextResponse, type NextRequest } from "next/server";
import { searchParishes, searchNearby } from "@/lib/nominatim";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  try {
    const latN = lat ? parseFloat(lat) : NaN;
    const lonN = lon ? parseFloat(lon) : NaN;
    const hasOrigin = !Number.isNaN(latN) && !Number.isNaN(lonN);

    if (q && q.trim().length >= 3) {
      const out = await searchParishes(
        q.trim(),
        hasOrigin ? { lat: latN, lon: lonN } : undefined
      );
      return NextResponse.json(out);
    }
    if (hasOrigin) {
      const results = await searchNearby(latN, lonN);
      return NextResponse.json({ results, totalFiltered: results.length });
    }
    return NextResponse.json({ results: [], totalFiltered: 0 });
  } catch (err) {
    console.error("[nominatim] error:", err);
    return NextResponse.json({ results: [], totalFiltered: 0 }, { status: 502 });
  }
}
