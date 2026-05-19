import { MergeFavoritesDialog } from "@/app/components/merge-favorites-dialog";

export default function SongLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <div className="flex flex-1 flex-col">{children}</div>
      <MergeFavoritesDialog />
    </>
  );
}
