"use client";

import { useMemo } from "react";
import { raioEmPixels } from "../domain/precisao";
import type { PosicaoPessoa } from "./useAcompanharLocalizacao";

/** O ponto de "você está aqui" pronto para o mapa: onde fica e o raio do halo, em pixels (D7). */
export type PontoPessoaVM = { lng: number; lat: number; raioHalo: number };

/** Converte a posição da pessoa no ponto do mapa, com o halo da precisão no zoom atual. */
export function usePontoDaPessoa(posicao: PosicaoPessoa | null, zoom: number): PontoPessoaVM | null {
  return useMemo(
    () => (posicao ? { lng: posicao.lng, lat: posicao.lat, raioHalo: raioEmPixels(posicao.precisao, posicao.lat, zoom) } : null),
    [posicao, zoom],
  );
}
