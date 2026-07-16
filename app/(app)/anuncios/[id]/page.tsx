import { notFound } from "next/navigation";
import sanitizeHtml from "sanitize-html";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Etiquetas que produce el editor (tiptap StarterKit + Link + Underline).
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "strong", "b", "em", "i", "u", "s", "strike",
    "ul", "ol", "li",
    "blockquote", "code", "pre",
    "a", "span", "div",
  ],
  allowedAttributes: { a: ["href", "target", "rel"] },
  allowedSchemes: ["http", "https", "mailto", "tel"],
};

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

  const safeHtml = sanitizeHtml(
    docRes.data.content_html as string,
    SANITIZE_OPTIONS
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl text-song-title">{annRes.data.title}</h1>
      </header>

      <article
        className="rich-doc"
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    </main>
  );
}
