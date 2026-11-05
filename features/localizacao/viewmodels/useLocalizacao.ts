"use client";

import { useCallback } from "react";
import { pedirLocalizacao, type ResultadoLocalizacao } from "./pedir-localizacao";

export type { ResultadoLocalizacao };

/**
 * "Usar minha localização" (FR-003 a FR-005). Só pede a posição quando `pedir()` é chamado, por
 * uma ação explícita da pessoa; nada é pedido ao montar. A coordenada vai direto para
 * `aoCentralizar` (o `flyTo` do mapa) e não passa por estado React, `localStorage`, URL nem
 * `console` (Princípio III).
 */
export function useLocalizacao(aoCentralizar: (lng: number, lat: number) => void) {
  const pedir = useCallback(
    () => pedirLocalizacao(typeof navigator === "undefined" ? undefined : navigator.geolocation, aoCentralizar),
    [aoCentralizar],
  );
  return { pedir };
}
