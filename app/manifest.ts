import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cancionero Arquidiocesano",
    short_name: "Cancionero",
    description: "Evangelizar a través de la música",
    start_url: "/",
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
