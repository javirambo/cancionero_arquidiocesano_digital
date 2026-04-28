import { NextResponse, type NextRequest } from "next/server";
import { searchGlobal } from "@/lib/songs";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const data = await searchGlobal(q);
  return NextResponse.json(data);
}
