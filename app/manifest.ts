import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cancionero Arquidiocesano",
    short_name: "Cancionero",
    description: "Evangelizar a través de la música",
    // El "pwa=1" marca que el arranque viene del ícono de la app instalada:
    // la home lo usa para abrir directo en la parroquia principal del usuario.
    start_url: "/?pwa=1",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f1f5fd",
    theme_color: "#1f3f73",
    lang: "es-AR",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
