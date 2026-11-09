"use client";

import { useSyncExternalStore } from "react";

const CONSULTA = "(prefers-reduced-motion: reduce)";

function assinar(avisar: () => void) {
  const consulta = window.matchMedia(CONSULTA);
  consulta.addEventListener("change", avisar);
  return () => consulta.removeEventListener("change", avisar);
}

/**
 * Se a pessoa pediu ao sistema menos movimento (FR-020). Acompanha a mudança sem recarregar. No
 * servidor a preferência é desconhecida, então o Gasosinha começa parado e só anima depois da
 * hidratação, quando o navegador confirma que pode.
 */
export function usePrefereMenosMovimento(): boolean {
  return useSyncExternalStore(
    assinar,
    () => window.matchMedia(CONSULTA).matches,
    () => true,
  );
}
