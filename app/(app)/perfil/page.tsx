import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GoogleSignInButton } from "./google-sign-in-button";
import { SignOutButton } from "./sign-out-button";
import { HeroContent } from "@/app/components/home-hero";

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
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12">
        <HeroContent parishName={null} />
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
      </main>
    );
  }

  // Sesión activa: traer perfil + parroquias + playlists count + favoritos.
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("display_name, email, avatar_url, parish_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[perfil] error leyendo users:", profileError);
  }

  const primaryParishId = (profile?.parish_id as string | null) ?? null;

  type ParishItem = { id: string; name: string; slug: string };

  const [membersRes, playlistsCountRes, favoritesRes] = await Promise.all([
    supabase
      .from("parish_members")
      .select("parishes(id, name, slug)")
      .eq("user_id", user.id),
    supabase
      .from("playlists")
      .select("id", { count: "exact", head: true })
      .eq("created_by", user.id),
    supabase
      .from("favorites")
      .select("target_kind, target_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const myParishes: ParishItem[] = ((membersRes.data ?? [])
    .map((m) => {
      const rel = m.parishes as ParishItem | ParishItem[] | null;
      return Array.isArray(rel) ? rel[0] : rel;
    })
    .filter((p): p is ParishItem => Boolean(p)));

  // Principal primero.
  myParishes.sort((a, b) => {
    if (a.id === primaryParishId) return -1;
    if (b.id === primaryParishId) return 1;
    return a.name.localeCompare(b.name, "es");
  });

  const playlistsCount = playlistsCountRes.count ?? 0;

  // Resolver títulos de favoritos en lote (mismo patrón que el dialog).
  type FavRow = { target_kind: "song" | "playlist" | "parish"; target_id: string };
  const favRows = (favoritesRes.data ?? []) as FavRow[];
  const songIds = favRows.filter((f) => f.target_kind === "song").map((f) => f.target_id);
  const favPlaylistIds = favRows.filter((f) => f.target_kind === "playlist").map((f) => f.target_id);
  const favParishIds = favRows.filter((f) => f.target_kind === "parish").map((f) => f.target_id);

  const [favSongsRes, favPlaylistsRes, favParishesRes] = await Promise.all([
    songIds.length
      ? supabase.from("songs").select("id, title, slug, number").in("id", songIds)
      : Promise.resolve({ data: [] }),
    favPlaylistIds.length
      ? supabase.from("playlists").select("id, name").in("id", favPlaylistIds)
      : Promise.resolve({ data: [] }),
    favParishIds.length
      ? supabase.from("parishes").select("id, name, slug").in("id", favParishIds)
      : Promise.resolve({ data: [] }),
  ]);

  type FavSong = { id: string; title: string; slug: string; number: number | null };
  type FavPlaylist = { id: string; name: string };
  type FavParish = { id: string; name: string; slug: string };

  const favSongs = (favSongsRes.data ?? []) as FavSong[];
  const favPlaylists = (favPlaylistsRes.data ?? []) as FavPlaylist[];
  const favParishes = (favParishesRes.data ?? []) as FavParish[];

  const displayName = profile?.display_name ?? user.email ?? "Usuario";
  const primaryParishName =
    myParishes.find((p) => p.id === primaryParishId)?.name ?? null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12">
      <HeroContent parishName={primaryParishName} />
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
        <h2 className="text-lg">Mis parroquias</h2>
        {myParishes.length === 0 ? (
          <p className="mt-2 text-sm normal-case text-muted-foreground">
            Todavía no te asociaste a ninguna parroquia.{" "}
            <Link href="/parroquias" className="text-primary hover:underline">
              Ver parroquias
            </Link>
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1 normal-case">
            {myParishes.map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-base">
                {p.id === primaryParishId && (
                  <span aria-label="Parroquia principal" title="Parroquia principal" className="text-secondary">
                    ★
                  </span>
                )}
                <Link
                  href={`/parroquias/${p.slug}`}
                  className="text-primary hover:underline"
                >
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-sidebar p-6">
        <h2 className="text-lg">Mis playlists</h2>
        <p className="mt-2 text-base normal-case">
          {playlistsCount === 0
            ? "Todavía no creaste playlists."
            : `Tenés ${playlistsCount} ${playlistsCount === 1 ? "playlist" : "playlists"}.`}{" "}
          <Link href="/playlists" className="text-primary hover:underline">
            Ver mis playlists
          </Link>
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-sidebar p-6">
        <h2 className="text-lg">Mis favoritos</h2>
        {favRows.length === 0 ? (
          <p className="mt-2 text-sm normal-case text-muted-foreground">
            Todavía no marcaste ningún favorito.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-4 normal-case">
            {favSongs.length > 0 && (
              <div>
                <h3 className="text-sm uppercase tracking-[0.15em] text-secondary">
                  Canciones
                </h3>
                <ul className="mt-1 flex flex-col gap-1">
                  {favSongs.map((s) => (
                    <li key={s.id} className="text-base">
                      <Link
                        href={`/canciones/${s.slug}`}
                        className="text-primary hover:underline"
                      >
                        {s.number ? `${s.number}. ` : ""}
                        {s.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {favPlaylists.length > 0 && (
              <div>
                <h3 className="text-sm uppercase tracking-[0.15em] text-secondary">
                  Playlists
                </h3>
                <ul className="mt-1 flex flex-col gap-1">
                  {favPlaylists.map((p) => (
                    <li key={p.id} className="text-base">
                      <Link
                        href={`/playlists/${p.id}`}
                        className="text-primary hover:underline"
                      >
                        {p.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {favParishes.length > 0 && (
              <div>
                <h3 className="text-sm uppercase tracking-[0.15em] text-secondary">
                  Parroquias
                </h3>
                <ul className="mt-1 flex flex-col gap-1">
                  {favParishes.map((p) => (
                    <li key={p.id} className="text-base">
                      <Link
                        href={`/parroquias/${p.slug}`}
                        className="text-primary hover:underline"
                      >
                        {p.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
