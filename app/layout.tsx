import type { Metadata, Viewport } from "next";
import { Cardo } from "next/font/google";
import Script from "next/script";
import { SiteHeader } from "./components/site-header";
import { ThemeProvider, themeInitScript } from "./components/theme";
import { FavoritesProvider } from "./components/favorites";
import { MergeFavoritesDialog } from "./components/merge-favorites-dialog";
import { PreferencesProvider } from "./components/preferences";
import { UserRolesProvider } from "./components/user-roles";
import { ToastProvider } from "./components/toast";
import { WakeLockProvider } from "./components/wake-lock";
import "./globals.css";

const cardo = Cardo({
  variable: "--font-cardo",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Cancionero Arquidiocesano",
  description: "Evangelizar a través de la música",
  openGraph: {
    locale: "es_AR",
    title: "Cancionero Arquidiocesano",
    description: "Evangelizar a través de la música",
  },
  verification: {
    google: "MQOeacAEK6YldtteyizvMjjD4gBKlgIrQ0UAXATwLMo",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Permite que el usuario haga zoom (accesibilidad).
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${cardo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-serif bg-background text-foreground">
        <Script
          id="theme-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <ThemeProvider>
          <UserRolesProvider>
            <PreferencesProvider>
              <FavoritesProvider>
                <ToastProvider>
                  <WakeLockProvider>
                    <SiteHeader />
                    {children}
                    <MergeFavoritesDialog />
                  </WakeLockProvider>
                </ToastProvider>
              </FavoritesProvider>
            </PreferencesProvider>
          </UserRolesProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
