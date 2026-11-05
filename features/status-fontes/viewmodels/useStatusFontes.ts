"use client";

import { useQuery } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { formatarData, hojeEmSaoPaulo } from "@/lib/formato";
import { dataAtualizacaoPrecos } from "../domain/atualizacao";
import { avaliarStatus, type AvisoFontes } from "../domain/avaliar-status";
import { buscarEstadoFontes } from "../services/estado-fontes.service";

const CHAVE = ["estado-fontes"] as const;
const VAZIO: StatusFontesVM = { aviso: null, precosAtualizadosEm: null };
const semAssinatura = () => () => {};

export type StatusFontesVM = {
  aviso: AvisoFontes | null;
  /** "24/10/2026": última atualização bem-sucedida dos preços, para a atribuição (FR-030). */
  precosAtualizadosEm: string | null;
};

/**
 * Situação das fontes (FR-027). A avaliação roda dentro da busca, fora do render, para não ler a
 * hora durante o render. Se a leitura falhar, não há aviso nem data, e o site segue normalmente.
 *
 * Os dados só aparecem depois da hidratação: a mesma consulta é aberta pelo aviso no layout, e ela
 * pode terminar antes de a tela do mapa hidratar, o que faria o cliente divergir do HTML do servidor.
 */
export function useStatusFontes(): StatusFontesVM {
  const hidratado = useSyncExternalStore(
    semAssinatura,
    () => true,
    () => false,
  );
  const { data } = useQuery({
    queryKey: CHAVE,
    queryFn: async (): Promise<StatusFontesVM> => {
      const estados = await buscarEstadoFontes();
      const atualizadoEm = dataAtualizacaoPrecos(estados);
      return {
        aviso: avaliarStatus(estados, hojeEmSaoPaulo(new Date())),
        precosAtualizadosEm: atualizadoEm ? formatarData(atualizadoEm) : null,
      };
    },
  });
  return hidratado && data ? data : VAZIO;
}
