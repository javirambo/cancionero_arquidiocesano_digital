import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminAccess } from "../access";
import { PendingParishRow } from "./pending-row";
import { AdminContactEmailsForm } from "./admin-contact-emails-form";

export default async function AdminParroquiasPage() {
  const access = await getAdminAccess();
  if (!access.isAdmin) redirect("/admin");
  const supabase = await createClient();
  const [parishesRes, settingRes] = await Promise.all([
    supabase
      .from("parishes")
      .select("id, name, slug, city, address, status")
      .order("name"),
    supabase
      .from("settings")
      .select("value")
      .eq("key", "admin_contact_emails")
      .maybeSingle(),
  ]);
  const parishes = parishesRes.data;
  const adminContactEmails = Array.isArray(settingRes.data?.value)
    ? (settingRes.data?.value as string[])
    : [];

  const pending = (parishes ?? []).filter((p) => p.status === "pending");
  const others = (parishes ?? []).filter((p) => p.status !== "pending");

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl">Parroquias</h1>
          <Link
            href="/admin/parroquias/nueva"
            className="rounded-full border border-primary px-4 py-2 text-sm font-semibold uppercase tracking-wide text-primary hover:bg-primary hover:text-primary-foreground"
          >
            + Nueva
          </Link>
        </div>
        <p className="text-sm normal-case text-muted-foreground">
          Alta, edición y baja de parroquias de la Arquidiócesis. Las parroquias en estado pendiente requieren revisión.
        </p>
      </header>

      <section className="flex flex-col gap-3 rounded-xl border border-border p-5">
        <h2 className="text-xs uppercase tracking-[0.2em] text-secondary">
          Configuración general
        </h2>
        <AdminContactEmailsForm initialEmails={adminContactEmails} />
      </section>

      {pending.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs uppercase tracking-[0.2em] text-secondary">
            Pendientes de revisión ({pending.length})
          </h2>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {pending.map((p) => (
              <PendingParishRow
                key={p.id}
                id={p.id as string}
                name={p.name as string}
                city={(p.city as string | null) ?? null}
                address={(p.address as string | null) ?? null}
              />
            ))}
          </ul>
        </section>
      )}

      {others.length > 0 && (
        <section className="flex flex-col gap-3">
          {pending.length > 0 && (
            <h2 className="text-xs uppercase tracking-[0.2em] text-secondary">
              Todas
            </h2>
          )}
          <ul className="divide-y divide-border rounded-xl border border-border">
            {others.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-sidebar"
              >
                <Link
                  href={`/admin/parroquias/${p.id}`}
                  className="flex flex-1 flex-col gap-0.5"
                >
                  <span className="text-base text-primary">{p.name}</span>
                  <span className="text-xs normal-case text-muted-foreground">
                    {p.city ?? "—"}
                    {p.status === "inactive" && " · inactiva"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pending.length === 0 && others.length === 0 && (
        <p className="text-sm normal-case text-muted-foreground">
          No hay parroquias cargadas todavía.
        </p>
      )}
    </main>
  );
}
