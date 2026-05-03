"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/app/components/toast";

type Props = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  address: string | null;
};

export function PendingParishRow({ id, name, slug, city, address }: Props) {
  const router = useRouter();
  const { show: showToast } = useToast();
  const [busy, setBusy] = useState(false);

  async function setStatus(next: "active" | "inactive") {
    if (busy) return;
    if (next === "inactive") {
      const ok = window.confirm(`¿Rechazar la parroquia "${name}"? Quedará inactiva.`);
      if (!ok) return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("parishes")
      .update({ status: next })
      .eq("id", id);
    if (error) {
      showToast(`No se pudo actualizar: ${error.message}`, "error");
      setBusy(false);
      return;
    }
    showToast(
      next === "active" ? `"${name}" aprobada.` : `"${name}" rechazada.`
    );
    router.refresh();
  }

  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3 transition-colors hover:bg-sidebar">
      <Link
        href={`/admin/parroquias/${slug}`}
        className="flex min-w-0 flex-1 flex-col gap-0.5"
      >
        <span className="truncate text-base text-primary">{name}</span>
        <span className="truncate text-xs normal-case text-muted-foreground">
          {[address, city].filter(Boolean).join(" · ") || "—"}
        </span>
      </Link>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => setStatus("active")}
          disabled={busy}
          className="rounded-full border border-primary bg-primary px-3 py-1 text-xs uppercase tracking-wide text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          Aprobar
        </button>
        <button
          type="button"
          onClick={() => setStatus("inactive")}
          disabled={busy}
          className="rounded-full border border-destructive px-3 py-1 text-xs uppercase tracking-wide text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50"
        >
          Rechazar
        </button>
      </div>
    </li>
  );
}
