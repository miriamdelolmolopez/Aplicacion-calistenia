import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Miriam del Olmo",
    short_name: "Miriam del Olmo",
    description: "Calistenia y pino · Fuengirola",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f3f1",
    theme_color: "#f4f3f1",
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
