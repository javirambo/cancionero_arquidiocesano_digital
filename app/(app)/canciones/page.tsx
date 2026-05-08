import { listPublicCategories, listSongsPaged } from "@/lib/songs";
import { SongsFrame } from "@/app/components/songs-frame";

export const metadata = {
  title: "Canciones · Cancionero Arquidiocesano",
};

const PAGE_SIZE = 50;

export default async function CancionesPage() {
  const [songsResult, categories] = await Promise.all([
    listSongsPaged(1, PAGE_SIZE),
    listPublicCategories(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl">Cantos</h1>
        <p className="text-base normal-case text-muted-foreground">
          Catálogo completo del cancionero.
        </p>
      </header>

      <SongsFrame
        initialItems={songsResult.items}
        initialTotal={songsResult.total}
        pageSize={PAGE_SIZE}
        categories={categories}
      />
    </main>
  );
}
