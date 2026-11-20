import type { Metadata, Viewport } from "next";
import { Lexend } from "next/font/google";
import { Suspense, type ReactNode } from "react";
import { Toaster } from "sonner";

import { Footer } from "@/components/Footer/Footer";
import { NavBar, NavBarView } from "@/components/NavBar/NavBar";

import { Providers } from "./providers";
import "@/styles/globals.scss";

const lexend = Lexend({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-lexend",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s · Kurios",
    default: "Registro de visitas · Kurios",
  },
  description: "Registro de visitas de Kurios Education a colegios.",
};

// La app solo tiene tema claro: controles nativos y barra del navegador a juego con el fondo.
export const viewport: Viewport = {
  themeColor: "#f7f5fb",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es" className={lexend.variable}>
      <body>
        <a href="#contenido" className="skip-link">
          Saltar al contenido
        </a>
        <Providers>
          {/* usePathname puede suspender en rutas dinámicas con cacheComponents. */}
          <Suspense fallback={<NavBarView pathname={null} />}>
            <NavBar />
          </Suspense>
          <main id="contenido" className="main">
            {children}
          </main>
          <Footer />
          <Toaster position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}
