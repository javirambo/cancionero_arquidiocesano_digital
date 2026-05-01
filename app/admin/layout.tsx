import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Administración · Cancionero Arquidiocesano",
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/perfil");

  const { data: roles } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", user.id);

  const roleNames = (roles ?? [])
    .map((r) => {
      const rel = r.roles as { name: string } | { name: string }[] | null;
      const single = Array.isArray(rel) ? rel[0] : rel;
      return single?.name;
    })
    .filter((n): n is string => Boolean(n));

  const isAdmin = roleNames.includes("admin");
  if (!isAdmin) redirect("/perfil");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
      <nav className="flex items-center gap-4 border-b border-border pb-3 text-sm normal-case">
        <span className="uppercase tracking-[0.2em] text-secondary">
          Administración
        </span>
        <Link href="/admin/parroquias" className="text-primary hover:underline">
          Parroquias
        </Link>
        <Link href="/admin/anuncios" className="text-primary hover:underline">
          Anuncios
        </Link>
        <Link href="/admin/playlists" className="text-primary hover:underline">
          Playlists
        </Link>
      </nav>
      {children}
    </div>
  );
}
