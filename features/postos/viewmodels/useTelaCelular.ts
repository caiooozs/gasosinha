"use client";

import { useSyncExternalStore } from "react";

const CONSULTA = "(max-width: 767px)";

function assinar(avisar: () => void) {
  const consulta = window.matchMedia(CONSULTA);
  consulta.addEventListener("change", avisar);
  return () => consulta.removeEventListener("change", avisar);
}

/**
 * Se a tela é de celular (abaixo de `md`, 768 px). O layout do celular (D9) depende disso para a
 * área visível e o foco no posto. No servidor, que não sabe a largura, vale o computador.
 */
export function useTelaCelular(): boolean {
  return useSyncExternalStore(
    assinar,
    () => window.matchMedia(CONSULTA).matches,
    () => false,
  );
}
