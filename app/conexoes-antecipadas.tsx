"use client";

import ReactDOM from "react-dom";

// Os dois servidores que a tela do mapa sempre usa: os tiles e o estilo do mapa base, e o Supabase,
// de onde vêm os postos.
const TILES = "https://tiles.openfreemap.org";
const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * Abre de antemão as conexões com os servidores do mapa (SC-003): o navegador resolve o DNS e faz
 * o aperto de mão do TLS enquanto o JavaScript ainda carrega, e o pedido dos tiles e dos postos já
 * encontra a conexão pronta. Numa rede 4G, isso economiza algumas idas e voltas. Segue o guia de
 * "Resource hints" do Next (`ReactDOM.preconnect`).
 */
export function ConexoesAntecipadas() {
  ReactDOM.preconnect(TILES, { crossOrigin: "anonymous" });
  if (SUPABASE) ReactDOM.preconnect(SUPABASE, { crossOrigin: "anonymous" });
  return null;
}
