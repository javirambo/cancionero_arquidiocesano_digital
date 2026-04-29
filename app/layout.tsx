import type { Metadata, Viewport } from "next";
import { Cardo } from "next/font/google";
import Script from "next/script";
import { SiteHeader } from "./components/site-header";
import { ThemeProvider, themeInitScript } from "./components/theme";
import { FavoritesProvider } from "./components/favorites";
import { PreferencesProvider } from "./components/preferences";
import { UserRolesProvider } from "./components/user-roles";
import "./globals.css";

const cardo = Cardo({
  variable: "--font-cardo",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Cancionero Arquidiocesano Digital",
  description: "Evangelizar a través de la música",
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
                <SiteHeader />
                {children}
              </FavoritesProvider>
            </PreferencesProvider>
          </UserRolesProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
