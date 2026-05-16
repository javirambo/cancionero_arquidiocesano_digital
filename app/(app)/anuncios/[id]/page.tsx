import Link from "next/link";
import { notFound } from "next/navigation";
import DOMPurify from "isomorphic-dompurify";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AnuncioDocumentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS filtra: si no está visible para el usuario (ventana de fecha,
  // parroquia, etc.), maybeSingle devuelve null.
  const [annRes, docRes] = await Promise.all([
    supabase
      .from("announcements")
      .select("id, title, kind")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("announcement_documents")
      .select("content_html, updated_at")
      .eq("announcement_id", id)
      .maybeSingle(),
  ]);

  if (!annRes.data || !docRes.data) notFound();

  const safeHtml = DOMPurify.sanitize(docRes.data.content_html as string, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "rel"],
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <Link
          href="/"
          className="text-xs uppercase tracking-[0.2em] text-secondary hover:text-primary"
        >
          ← Volver al inicio
        </Link>
        <h1 className="text-3xl text-primary">{annRes.data.title}</h1>
      </header>

      <article
        className="rich-doc"
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    </main>
  );
}
