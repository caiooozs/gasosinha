"use client";

import { useSyncExternalStore } from "react";
import { hojeEmSaoPaulo, type DataISO } from "@/lib/formato";

const semAssinatura = () => () => {};

/**
 * O "hoje" para os componentes cliente: no pré-render e na hidratação vale o valor calculado no
 * servidor (`hojeParaRender`); depois, a data do navegador no fuso de São Paulo. Nenhum outro
 * código cliente lê a hora durante o render.
 */
export function useHoje(hojeServidor: DataISO): DataISO {
  return useSyncExternalStore(
    semAssinatura,
    () => hojeEmSaoPaulo(new Date()),
    () => hojeServidor,
  );
}
