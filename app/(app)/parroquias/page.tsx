import Link from "next/link";
import { listParishes } from "@/lib/songs";
import { createClient } from "@/lib/supabase/server";
import { ParishList } from "./parish-list";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Parroquias · Cancionero Arquidiocesano",
};

export default async function ParroquiasPage() {
  // La parroquia virtual "arquidiocesis" no se lista acá: no es una
  // parroquia común a la que un usuario se asocia. Sus playlists se ven
  // por todas las parroquias gracias a `is_archdiocesan`.
  const parishes = (await listParishes()).filter(
    (p) => p.slug !== "arquidiocesis"
  );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let memberIds: string[] = [];
  let primaryId: string | null = null;
  let isAdmin = false;
  let canAddParish = false;
  if (user) {
    const [membersRes, profileRes, rolesRes] = await Promise.all([
      supabase
        .from("parish_members")
        .select("parish_id, role")
        .eq("user_id", user.id),
      supabase.from("users").select("parish_id").eq("id", user.id).maybeSingle(),
      supabase.from("user_roles").select("roles(name)").eq("user_id", user.id),
    ]);
    const memberRows = (membersRes.data ?? []) as Array<{
      parish_id: string;
      role: string | null;
    }>;
    memberIds = memberRows.map((m) => m.parish_id);
    primaryId = (profileRes.data?.parish_id as string | null) ?? null;
    const roleNames = (rolesRes.data ?? [])
      .map((r) => {
        const rel = r.roles as { name: string } | { name: string }[] | null;
        const single = Array.isArray(rel) ? rel[0] : rel;
        return single?.name as string | undefined;
      })
      .filter((n): n is string => Boolean(n));
    isAdmin = roleNames.includes("admin");
    const isEditor = roleNames.includes("editor");
    const isCoordinator = memberRows.some((m) => m.role === "coordinator");
    canAddParish = isAdmin || isEditor || isCoordinator;
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-wrap items-start gap-4">
        <div className="flex flex-1 flex-col gap-2">
          <h1 className="text-3xl">Parroquias</h1>
          {user ? (
            <p className="text-base normal-case text-muted-foreground">
              Comunidades de la Arquidiócesis con sus repertorios. Asociate con
              [+] y marcá tu principal con la estrella.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              <p className="text-base italic normal-case text-muted-foreground">
                Estás navegando como invitado. Iniciá sesión para guardar tus
                favoritos en la nube, vincular tu parroquia y acceder a tus
                listas.
              </p>
              <p className="text-base normal-case text-muted-foreground">
                Comunidades de la Arquidiócesis con sus repertorios.
              </p>
            </div>
          )}
        </div>
        {canAddParish && (
          <Link
            href={isAdmin ? "/admin/parroquias/nueva" : "/parroquias/nueva"}
            className="rounded-full border border-primary px-4 py-2 text-sm font-semibold uppercase tracking-wide text-primary hover:bg-primary hover:text-primary-foreground"
          >
            + Agregar parroquia
          </Link>
        )}
      </header>

      {parishes.length === 0 ? (
        <p className="rounded-xl border border-border bg-sidebar p-6 text-base normal-case text-muted-foreground">
          Todavía no hay parroquias publicadas.
        </p>
      ) : (
        <ParishList
          parishes={parishes}
          initialMemberIds={memberIds}
          initialPrimaryId={primaryId}
          userId={user?.id ?? null}
        />
      )}
    </main>
  );
}
