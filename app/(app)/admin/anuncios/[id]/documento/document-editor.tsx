"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { createClient } from "@/lib/supabase/client";

export function DocumentEditor({
  announcementId,
  initialHtml,
}: {
  announcementId: string;
  initialHtml: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
    ],
    content: initialHtml || "<p></p>",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "rich-doc focus:outline-none min-h-[24rem] normal-case",
      },
    },
  });

  async function handleSave() {
    if (!editor) return;
    setSaving(true);
    setError(null);
    const html = editor.getHTML();
    const supabase = createClient();
    const { error: upErr } = await supabase
      .from("announcement_documents")
      .upsert({ announcement_id: announcementId, content_html: html });
    if (upErr) {
      setError(upErr.message);
      setSaving(false);
      return;
    }
    setSaving(false);
    setSavedAt(new Date().toLocaleTimeString("es-AR"));
    router.refresh();
  }

  function setLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL del enlace", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  if (!editor) {
    return (
      <p className="text-sm normal-case text-muted-foreground">Cargando editor…</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Toolbar editor={editor} onLink={setLink} />
      <div className="rounded-2xl border border-border bg-background p-4 sm:p-6">
        <EditorContent editor={editor} />
      </div>

      {error && <p className="text-sm normal-case text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full border border-primary bg-primary px-5 py-2 text-sm font-semibold uppercase tracking-wide text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/admin/anuncios/${announcementId}/editar`)}
          className="rounded-full border border-border px-5 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:border-primary hover:text-primary"
        >
          Volver
        </button>
        {savedAt && (
          <span className="text-xs normal-case text-muted-foreground">
            Guardado a las {savedAt}
          </span>
        )}
      </div>
    </div>
  );
}

function Toolbar({ editor, onLink }: { editor: Editor; onLink: () => void }) {
  const btn =
    "rounded-md border border-border bg-background px-2 py-1 text-xs font-semibold normal-case hover:border-primary hover:text-primary";
  const active = "border-primary text-primary";

  return (
    <div className="flex flex-wrap gap-1">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`${btn} ${editor.isActive("bold") ? active : ""}`}
        title="Negrita"
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`${btn} ${editor.isActive("italic") ? active : ""}`}
        title="Cursiva"
      >
        <em>I</em>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`${btn} ${editor.isActive("underline") ? active : ""}`}
        title="Subrayado"
      >
        <u>U</u>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`${btn} ${editor.isActive("strike") ? active : ""}`}
        title="Tachado"
      >
        <s>S</s>
      </button>
      <span className="mx-1 w-px bg-border" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`${btn} ${editor.isActive("heading", { level: 1 }) ? active : ""}`}
        title="Título"
      >
        H1
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`${btn} ${editor.isActive("heading", { level: 2 }) ? active : ""}`}
        title="Subtítulo"
      >
        H2
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`${btn} ${editor.isActive("heading", { level: 3 }) ? active : ""}`}
        title="Encabezado 3"
      >
        H3
      </button>
      <span className="mx-1 w-px bg-border" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`${btn} ${editor.isActive("bulletList") ? active : ""}`}
        title="Lista con viñetas"
      >
        • Lista
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`${btn} ${editor.isActive("orderedList") ? active : ""}`}
        title="Lista numerada"
      >
        1. Lista
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`${btn} ${editor.isActive("blockquote") ? active : ""}`}
        title="Cita"
      >
        “ ”
      </button>
      <span className="mx-1 w-px bg-border" />
      <button
        type="button"
        onClick={onLink}
        className={`${btn} ${editor.isActive("link") ? active : ""}`}
        title="Enlace"
      >
        Link
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        className={btn}
        title="Quitar formato"
      >
        Limpiar
      </button>
    </div>
  );
}
