import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import ActualizadorApp from "./ActualizadorApp";
import BarraComo from "./BarraComo";
import AvisoFoto from "./AvisoFoto";
import MenuUsuario from "./MenuUsuario";
import NavegacionInferior from "./NavegacionInferior";
import { SCRIPT_TEMA } from "./useTema";
import "./globals.css";

// Una sola familia para títulos y texto (Inter). Se sigue llamando «--font-outfit» por dentro para no tocar los demás estilos;
// «--font-jakarta» (la del sistema de diseño Calistenia UI) apunta a la misma, ver globals.css.
const letra = Inter({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "CalisCoach",
  description: "Calistenia y pino · Fuengirola",
  appleWebApp: { capable: true, title: "CalisCoach" },
  // Demuestra a Google Search Console que la página es de Miriam (verificación de la marca del inicio de sesión).
  verification: { google: "ng6qurHBSBlnVr4Q7hCvbojrO7y7xfUnphpyztCoiII" },
};

export const viewport: Viewport = {
  themeColor: "#f3f4f5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={letra.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body>
        {children}
        <NavegacionInferior />
        <MenuUsuario />
        <AvisoFoto />
        <ActualizadorApp />
        <BarraComo />
      </body>
    </html>
  );
}
