import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminAccess } from "../../access";
import { ParroquiaForm } from "../parroquia-form";

export default async function NuevaParroquiaPage() {
  const access = await getAdminAccess();
  if (!access.isAdmin && !access.isEditor) redirect("/admin");

  const supabase = await createClient();
  const { data: parishesRaw } = await supabase
    .from("parishes")
    .select("id, name, decanato")
    .eq("status", "active")
    .is("parent_id", null)
    .neq("slug", "arquidiocesis")
    .order("name", { ascending: true });
  const parishes = (parishesRaw ?? []) as Array<{
    id: string;
    name: string;
    decanato: string | null;
  }>;

  const { data: decanatosRaw } = await supabase
    .from("parishes")
    .select("decanato")
    .neq("slug", "arquidiocesis")
    .not("decanato", "is", null);
  const decanatos = Array.from(
    new Set(
      ((decanatosRaw ?? []) as Array<{ decanato: string | null }>)
        .map((r) => r.decanato?.trim())
        .filter((d): d is string => Boolean(d))
    )
  ).sort((a, b) => a.localeCompare(b, "es"));

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl text-page-title">Nueva parroquia</h1>
      </header>
      <ParroquiaForm
        mode="create"
        parishes={parishes}
        decanatos={decanatos}
        restricted={false}
      />
    </main>
  );
}
