import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import NavegacionInferior from "./NavegacionInferior";
import "./globals.css";

const titulos = Cormorant_Garamond({
  variable: "--font-titulos",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const cuerpo = Montserrat({
  variable: "--font-cuerpo",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Miriam del Olmo",
  description: "Calistenia y pino · Fuengirola",
  appleWebApp: { capable: true, title: "Miriam del Olmo" },
};

export const viewport: Viewport = {
  themeColor: "#f4efe6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${titulos.variable} ${cuerpo.variable}`}>
      <body>
        {children}
        <NavegacionInferior />
      </body>
    </html>
  );
}
