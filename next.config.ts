import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La versión publicada, para que la app instalada sepa si tiene que recargarse (ver ActualizadorApp).
  env: { NEXT_PUBLIC_BUILD: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev" },
  async headers() {
    return [
      {
        // Fotos de ejemplo: el nombre lleva la versión (-v2), así que el móvil puede guardarlas un año.
        source: "/fotos/:ruta*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
