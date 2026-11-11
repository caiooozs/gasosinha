"use client";

import { useState } from "react";

/**
 * Se a lista está recolhida numa pílula, no computador (D6), para o mapa ganhar a área toda. O
 * estado fica só na memória da página: começa aberta a cada visita, e abrir um posto não muda nada.
 */
export function useListaRecolhida(): { recolhida: boolean; recolher: () => void; expandir: () => void } {
  const [recolhida, setRecolhida] = useState(false);
  return { recolhida, recolher: () => setRecolhida(true), expandir: () => setRecolhida(false) };
}
