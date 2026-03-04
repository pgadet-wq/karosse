import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KAROSSE",
    short_name: "Karosse",
    description: "Covoiturage scolaire Nouméa",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#1B4F72",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
