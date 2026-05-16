import { listPublicCategories, listSongsPaged } from "@/lib/songs";
import { SongsFrame } from "@/app/components/songs-frame";

export const metadata = {
  title: "Canciones · Cancionero Arquidiocesano",
};

const PAGE_SIZE = 50;

export default async function CancionesPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string | string[] }>;
}) {
  const sp = await searchParams;
  const rawCat = sp.cat;
  const urlCatSlugs = rawCat
    ? Array.isArray(rawCat)
      ? rawCat
      : [rawCat]
    : [];

  const [songsResult, categories] = await Promise.all([
    listSongsPaged(1, PAGE_SIZE, urlCatSlugs),
    listPublicCategories(),
  ]);

  const lockedCategories = urlCatSlugs.length > 0;
  const lockedCats = lockedCategories
    ? urlCatSlugs
        .map((slug) => categories.find((c) => c.slug === slug))
        .filter((c): c is (typeof categories)[number] => Boolean(c))
    : [];
  const lockedDescription = lockedCats
    .map((c) => c.description?.trim())
    .filter((d): d is string => Boolean(d))
    .join(" · ");

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl text-page-title">
          {lockedCats.length > 0
            ? lockedCats.map((c) => c.name).join(" · ")
            : "Cantos"}
        </h1>
        {!lockedCategories ? (
          <p className="text-base normal-case text-muted-foreground">
            Catálogo completo del cancionero.
          </p>
        ) : (
          lockedDescription && (
            <p className="text-base normal-case text-muted-foreground">
              {lockedDescription}
            </p>
          )
        )}
      </header>

      <SongsFrame
        initialItems={songsResult.items}
        initialTotal={songsResult.total}
        pageSize={PAGE_SIZE}
        categories={categories}
        lockedCategorySlugs={lockedCategories ? urlCatSlugs : undefined}
        showSeeAll={false}
      />
    </main>
  );
}
