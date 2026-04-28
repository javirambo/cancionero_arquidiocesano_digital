import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GoogleSignInButton } from "./google-sign-in-button";
import { SignOutButton } from "./sign-out-button";

export const metadata = {
  title: "Perfil · Cancionero Arquidiocesano",
};

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
        <header className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-secondary">
            Perfil
          </p>
          <h1 className="text-3xl">Invitado</h1>
          <p className="text-base normal-case text-muted-foreground">
            Estás navegando como invitado. Iniciá sesión para guardar tus
            favoritos en la nube, vincular tu parroquia y acceder a tus listas.
          </p>
        </header>

        <section className="rounded-2xl border border-border bg-sidebar p-6">
          <h2 className="text-xl">Iniciar sesión</h2>
          <p className="mt-2 text-sm normal-case text-muted-foreground">
            Iniciá sesión con tu cuenta de Google para guardar favoritos,
            vincular tu parroquia y acceder a tus listas.
          </p>
          <GoogleSignInButton />
        </section>

        <section aria-labelledby="atajos-heading" className="flex flex-col gap-3">
          <h2 id="atajos-heading" className="text-xl">
            Mientras tanto
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            <li>
              <Link
                href="/canciones"
                className="flex flex-col gap-1 rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary"
              >
                <span className="text-base text-primary">Canciones</span>
                <span className="text-xs normal-case text-muted-foreground">
                  Catálogo del cancionero
                </span>
              </Link>
            </li>
            <li>
              <Link
                href="/playlists"
                className="flex flex-col gap-1 rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary"
              >
                <span className="text-base text-primary">Playlists</span>
                <span className="text-xs normal-case text-muted-foreground">
                  Repertorios de las parroquias
                </span>
              </Link>
            </li>
          </ul>
        </section>
      </main>
    );
  }

  // Sesión activa: traer perfil + parroquia.
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("display_name, email, avatar_url, parish_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[perfil] error leyendo users:", profileError);
  }

  let parish: { name: string; slug: string } | null = null;
  if (profile?.parish_id) {
    const { data: parishRow } = await supabase
      .from("parishes")
      .select("name, slug")
      .eq("id", profile.parish_id)
      .maybeSingle();
    parish = parishRow ?? null;
  }

  const displayName = profile?.display_name ?? user.email ?? "Usuario";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url as string}
              alt=""
              className="h-16 w-16 shrink-0 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-border bg-sidebar text-2xl text-muted-foreground">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-xs uppercase tracking-[0.2em] text-secondary">
              Perfil
            </p>
            <h1 className={`truncate text-2xl ${displayName.includes("@") ? "lowercase" : ""}`}>
              {displayName}
            </h1>
            {profile?.email && (
              <p className="truncate text-sm lowercase text-muted-foreground">
                {profile.email as string}
              </p>
            )}
          </div>
        </div>
        <div className="self-end sm:self-auto">
          <SignOutButton />
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-sidebar p-6">
        <h2 className="text-lg">Mi parroquia</h2>
        {parish ? (
          <p className="mt-2 text-base normal-case">
            <Link
              href={`/parroquias/${parish.slug}`}
              className="text-primary hover:underline"
            >
              {parish.name}
            </Link>
          </p>
        ) : (
          <p className="mt-2 text-sm normal-case text-muted-foreground">
            Todavía no vinculaste tu parroquia.
          </p>
        )}
      </section>
    </main>
  );
}
