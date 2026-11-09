"use client";

import { SCRIPT_TEMA } from "@/features/tema/tema";

/**
 * Script do tema no <head> (guia "Preventing Flash" do Next): no HTML do servidor é
 * `text/javascript` e roda antes da primeira pintura; no navegador vira `text/plain`, para o React
 * não avisar de um <script> renderizado no cliente. O `suppressHydrationWarning` aceita a troca.
 */
export function ScriptTema() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }}
    />
  );
}
