import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "no-session" }, { status: 401 });
  }

  let body: { name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length === 0) {
    return NextResponse.json({ error: "name-required" }, { status: 400 });
  }
  if (name.length > 120) {
    return NextResponse.json({ error: "name-too-long" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("playlists")
    .insert({
      name,
      parish_id: null,
      created_by: user.id,
      visibility: "public",
      is_archdiocesan: false,
    })
    .select("id, name")
    .single();

  if (error) {
    console.error("[playlists/nueva-rapida]", error);
    return NextResponse.json(
      { error: "insert-failed", message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: data.id, name: data.name });
}
