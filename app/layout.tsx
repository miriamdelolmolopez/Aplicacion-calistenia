import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Outfit } from "next/font/google";
import NavegacionInferior from "./NavegacionInferior";
import SesionRecordada from "./SesionRecordada";
import "./globals.css";

// Una sola familia para títulos y texto (Outfit) y una monoespaciada para cifras y datos.
const letra = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Miriam del Olmo",
  description: "Calistenia y pino · Fuengirola",
  appleWebApp: { capable: true, title: "Miriam del Olmo" },
};

export const viewport: Viewport = {
  themeColor: "#f4f3f1",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${letra.variable} ${mono.variable}`}>
      <body>
        {children}
        <NavegacionInferior />
        <SesionRecordada />
      </body>
    </html>
  );
}
