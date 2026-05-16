import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DocumentEditor } from "./document-editor";

export const dynamic = "force-dynamic";

export default async function EditarDocumentoAnuncioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [annRes, docRes] = await Promise.all([
    supabase
      .from("announcements")
      .select("id, title")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("announcement_documents")
      .select("content_html")
      .eq("announcement_id", id)
      .maybeSingle(),
  ]);

  if (!annRes.data) notFound();

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl text-page-title">Documento de “{annRes.data.title}”</h1>
        <p className="text-sm normal-case text-muted-foreground">
          Editor enriquecido. Podés pegar contenido desde Word, Google Docs u otra
          página manteniendo el formato.
        </p>
      </header>

      <DocumentEditor
        announcementId={id}
        initialHtml={(docRes.data?.content_html as string | undefined) ?? ""}
      />
    </main>
  );
}
