import { SiteHeader } from "@/app/components/site-header";
import { SiteFooter } from "@/app/components/site-footer";
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
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
      <MergeFavoritesDialog />
    </HomeTitleProvider>
  );
}
