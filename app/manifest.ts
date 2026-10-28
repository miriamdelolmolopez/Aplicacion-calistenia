import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CalisCoach",
    short_name: "CalisCoach",
    description: "Calistenia y pino · Fuengirola",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f4f5",
    theme_color: "#f3f4f5",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
