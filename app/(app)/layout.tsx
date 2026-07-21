import { SiteHeader } from "@/app/components/site-header";
import { BottomNav } from "@/app/components/bottom-nav";
import { MergeFavoritesDialog } from "@/app/components/merge-favorites-dialog";
import { HomeTitleProvider } from "@/app/components/home-title-context";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <HomeTitleProvider>
      <SiteHeader />
      {/* pb-28 reserva el alto de la píldora flotante para que no tape el
          contenido al final de la página. */}
      <div className="flex flex-1 flex-col pb-28">{children}</div>
      <BottomNav />
      <MergeFavoritesDialog />
    </HomeTitleProvider>
  );
}
