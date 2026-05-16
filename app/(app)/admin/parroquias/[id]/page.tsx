import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminAccess } from "../../access";
import { ParroquiaForm } from "../parroquia-form";

export default async function EditarParroquiaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const access = await getAdminAccess();
  if (!access.isAdmin && !access.isEditor) redirect("/admin");
  const { id } = await params;
  const supabase = await createClient();
  const { data: parish } = await supabase
    .from("parishes")
    .select("id, name, slug, address, city, phone, email, description, status")
    .eq("id", id)
    .maybeSingle();

  if (!parish) notFound();

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link
          href="/admin/parroquias"
          className="flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-secondary hover:underline"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Parroquias
        </Link>
        <h1 className="text-2xl">{parish.name}</h1>
      </header>
      <ParroquiaForm
        mode="edit"
        initial={{
          id: parish.id,
          name: parish.name,
          slug: parish.slug,
          address: parish.address ?? "",
          city: parish.city ?? "",
          phone: parish.phone ?? "",
          email: parish.email ?? "",
          description: parish.description ?? "",
          status: parish.status,
        }}
      />
    </main>
  );
}
