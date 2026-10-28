import type { Metadata, Viewport } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import NavegacionInferior from "./NavegacionInferior";
import SesionRecordada from "./SesionRecordada";
import "./globals.css";

// Una sola familia para títulos y texto (Outfit) y Plus Jakarta Sans para el diseño nuevo.
const letra = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Letra del sistema de diseño Calistenia UI (solo la usan las pantallas migradas).
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Miriam del Olmo",
  description: "Calistenia y pino · Fuengirola",
  appleWebApp: { capable: true, title: "Miriam del Olmo" },
};

export const viewport: Viewport = {
  themeColor: "#f3f4f5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${letra.variable} ${jakarta.variable}`}>
      <body>
        {children}
        <NavegacionInferior />
        <SesionRecordada />
      </body>
    </html>
  );
}
