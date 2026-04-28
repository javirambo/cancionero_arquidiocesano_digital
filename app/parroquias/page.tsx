import { listParishes } from "@/lib/songs";
import { createClient } from "@/lib/supabase/server";
import { ParishCard } from "./parish-card";

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

  let memberIds = new Set<string>();
  let primaryId: string | null = null;
  if (user) {
    const [membersRes, profileRes] = await Promise.all([
      supabase.from("parish_members").select("parish_id").eq("user_id", user.id),
      supabase.from("users").select("parish_id").eq("id", user.id).maybeSingle(),
    ]);
    memberIds = new Set(
      (membersRes.data ?? []).map((m) => m.parish_id as string)
    );
    primaryId = (profileRes.data?.parish_id as string | null) ?? null;
  }

  // Separar en "mis parroquias" (asociadas) y "otras".
  const sortByName = (a: typeof parishes[0], b: typeof parishes[0]) =>
    a.name.localeCompare(b.name, "es");

  const mine = parishes
    .filter((p) => memberIds.has(p.id))
    .sort((a, b) => {
      const aPrim = a.id === primaryId ? 0 : 1;
      const bPrim = b.id === primaryId ? 0 : 1;
      if (aPrim !== bPrim) return aPrim - bPrim;
      return sortByName(a, b);
    });
  const others = parishes.filter((p) => !memberIds.has(p.id)).sort(sortByName);

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
        <>
          {user && mine.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xs uppercase tracking-[0.2em] text-secondary">
                Mis parroquias
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2">
                {mine.map((p) => (
                  <ParishCard
                    key={p.id}
                    parish={p}
                    isLogged={true}
                    isMember={true}
                    isPrimary={primaryId === p.id}
                  />
                ))}
              </ul>
            </section>
          )}

          {others.length > 0 && (
            <section className="flex flex-col gap-3">
              {user && mine.length > 0 && (
                <h2 className="text-xs uppercase tracking-[0.2em] text-secondary">
                  Otras parroquias
                </h2>
              )}
              <ul className="grid gap-4 sm:grid-cols-2">
                {others.map((p) => (
                  <ParishCard
                    key={p.id}
                    parish={p}
                    isLogged={Boolean(user)}
                    isMember={false}
                    isPrimary={false}
                  />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}
