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
  if (user) {
    const [membersRes, profileRes] = await Promise.all([
      supabase.from("parish_members").select("parish_id").eq("user_id", user.id),
      supabase.from("users").select("parish_id").eq("id", user.id).maybeSingle(),
    ]);
    memberIds = (membersRes.data ?? []).map((m) => m.parish_id as string);
    primaryId = (profileRes.data?.parish_id as string | null) ?? null;
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl">Parroquias</h1>
        <p className="text-base normal-case text-muted-foreground">
          Comunidades de la Arquidiócesis con sus repertorios.
          {user && " Asociate con [+] y marcá tu principal con la estrella."}
        </p>
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
