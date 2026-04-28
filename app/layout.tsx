import type { Metadata } from "next";
import { Cardo } from "next/font/google";
import { SiteHeader } from "./components/site-header";
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
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
