import type { Metadata } from "next";
import { Faustina, Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { AvisoFonte } from "@/components/avisos/AvisoFonte";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Faustina só nas manchetes (identidade visual do Paper).
const faustina = Faustina({
  variable: "--font-faustina",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gasosinha",
  description:
    "Mapa dos postos da Região Metropolitana do Recife com o preço da gasolina comum, a data da coleta e como o preço variou.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
};

export default function RootLayout({ children, detalhe }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} ${faustina.variable} h-full antialiased`}>
      {/* Altura fixa da janela: a tela do mapa ocupa o que sobra abaixo do aviso de fonte. */}
      <body className="flex h-dvh flex-col">
        <Providers>
          {/* O aviso aparece em todas as rotas, inclusive /postos/[cnpj] (SC-008). */}
          <Suspense fallback={null}>
            <AvisoFonte />
          </Suspense>
          {children}
          {/* Detalhe do posto como modal sobre o mapa (rota interceptada @detalhe/(.)postos/[cnpj]). */}
          {detalhe}
        </Providers>
      </body>
    </html>
  );
}
