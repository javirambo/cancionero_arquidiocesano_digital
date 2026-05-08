import { InstallPwaPrompt } from "@/app/components/install-pwa-prompt";
import { InstallSections } from "./install-sections";
import { createClient } from "@/lib/supabase/server";
import { PrecacheButton } from "@/app/components/precache-button";

export const metadata = {
  title: "Instalar la app · Cancionero Arquidiocesano",
};

export default async function InstallPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let favoriteSlugs: string[] = [];
  if (user) {
    const { data: favs } = await supabase
      .from("favorites")
      .select("target_id")
      .eq("user_id", user.id)
      .eq("target_kind", "song");
    const songIds = (favs ?? []).map((f) => f.target_id as string);
    if (songIds.length > 0) {
      const { data: songs } = await supabase
        .from("songs")
        .select("slug")
        .in("id", songIds);
      favoriteSlugs = (songs ?? []).map((s) => s.slug as string);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl">Instalar la app</h1>
        <p className="text-base normal-case text-muted-foreground">
          Instalá el cancionero como app en tu dispositivo para acceder más
          rápido y usarlo sin conexión durante la misa.
        </p>
      </header>

      <InstallPwaPrompt />

      <InstallSections
        ios={
          <ol className="list-decimal space-y-2 pl-5 text-base normal-case text-muted-foreground">
            <li>
              Abrí esta página en <strong>Safari</strong> (no funciona en
              Chrome ni en otros navegadores).
            </li>
            <li>
              Tocá el botón <strong>Compartir</strong> — el cuadrado con flecha
              hacia arriba, abajo en el centro de la pantalla.
            </li>
            <li>
              Bajá en el menú y elegí{" "}
              <strong>Agregar a pantalla de inicio</strong>.
            </li>
            <li>
              Confirmá tocando <strong>Agregar</strong> arriba a la derecha.
            </li>
          </ol>
        }
        android={
          <ol className="list-decimal space-y-2 pl-5 text-base normal-case text-muted-foreground">
            <li>
              Abrí esta página en <strong>Chrome</strong>.
            </li>
            <li>
              Si aparece un cartel &quot;Instalar app&quot;, tocalo. Si no,
              tocá el menú de <strong>tres puntos</strong> arriba a la derecha.
            </li>
            <li>
              Elegí <strong>Instalar app</strong> o{" "}
              <strong>Agregar a la pantalla de inicio</strong>.
            </li>
            <li>
              Confirmá tocando <strong>Instalar</strong>.
            </li>
          </ol>
        }
        desktop={
          <ol className="list-decimal space-y-2 pl-5 text-base normal-case text-muted-foreground">
            <li>
              Abrí esta página en <strong>Chrome</strong> o{" "}
              <strong>Edge</strong>.
            </li>
            <li>
              Buscá el ícono de instalación a la derecha de la barra de
              direcciones (un cuadrado con una flecha hacia abajo) y hacé
              click.
            </li>
            <li>
              Si no lo ves, abrí el menú del navegador y elegí{" "}
              <strong>Instalar Cancionero…</strong>.
            </li>
            <li>
              Confirmá tocando <strong>Instalar</strong>. La app va a aparecer
              como una aplicación más en tu sistema.
            </li>
          </ol>
        }
        info={
          <ul className="list-disc space-y-2 pl-5 text-base normal-case text-muted-foreground">
            <li>
              Tenés un ícono propio en tu pantalla de inicio o escritorio.
            </li>
            <li>Se abre como una app, sin la barra del navegador.</li>
            <li>
              Funciona sin conexión para las canciones que ya hayas visitado o
              descargado desde &quot;Mis favoritos&quot; y las listas.
            </li>
          </ul>
        }
      />

      {favoriteSlugs.length > 0 && (
        <section className="rounded-2xl border border-border bg-sidebar p-6">
          <h2 className="text-xl">Mis favoritos offline</h2>
          <p className="mt-2 text-sm normal-case text-muted-foreground">
            Descargá tus canciones favoritas para tenerlas disponibles sin
            conexión.
          </p>
          <div className="mt-4">
            <PrecacheButton
              slugs={favoriteSlugs}
              storageKey="favoritos"
              label="Descargar favoritos para offline"
            />
          </div>
        </section>
      )}
    </main>
  );
}
