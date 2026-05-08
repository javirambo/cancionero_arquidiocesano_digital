"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  initialEmails: string[];
};

function parseEmails(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map((e) => e.trim())
    .filter(Boolean);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function AdminContactEmailsForm({ initialEmails }: Props) {
  const [raw, setRaw] = useState<string>(initialEmails.join(", "));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<
    { kind: "ok" | "error"; text: string } | null
  >(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    const emails = parseEmails(raw);
    const invalid = emails.filter((e) => !isValidEmail(e));
    if (invalid.length > 0) {
      setMessage({
        kind: "error",
        text: `Email inválido: ${invalid.join(", ")}`,
      });
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("settings")
      .update({ value: emails, updated_at: new Date().toISOString() })
      .eq("key", "admin_contact_emails");
    setSaving(false);
    if (error) {
      setMessage({ kind: "error", text: error.message });
      return;
    }
    setRaw(emails.join(", "));
    setMessage({ kind: "ok", text: "Guardado." });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label
        htmlFor="admin-contact-emails"
        className="text-sm normal-case text-muted-foreground"
      >
        Emails de contacto del administrador general (separados por coma).
        Se muestran a los visitantes cuando una parroquia no tiene Coordinador
        asignado.
      </label>
      <textarea
        id="admin-contact-emails"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        rows={2}
        className="rounded-xl border border-border bg-background px-4 py-3 text-base normal-case focus:border-primary focus:outline-none"
        placeholder="admin@ejemplo.com, otro@ejemplo.com"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full border border-primary px-4 py-2 text-sm font-semibold uppercase tracking-wide text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
        {message && (
          <span
            className={
              message.kind === "ok"
                ? "text-sm normal-case text-primary"
                : "text-sm normal-case text-destructive"
            }
          >
            {message.text}
          </span>
        )}
      </div>
    </form>
  );
}
