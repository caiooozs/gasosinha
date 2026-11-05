"use client";

import { useQuery } from "@tanstack/react-query";
import { hojeEmSaoPaulo } from "@/lib/formato";
import { avaliarStatus, type AvisoFontes } from "../domain/avaliar-status";
import { buscarEstadoFontes } from "../services/estado-fontes.service";

const CHAVE = ["estado-fontes"] as const;

/**
 * Aviso de fonte com problema (FR-027). A avaliação roda dentro da busca, fora do render, para não
 * ler a hora durante o render. Se a leitura falhar, não há aviso, e o site segue normalmente.
 */
export function useStatusFontes(): { aviso: AvisoFontes | null } {
  const { data } = useQuery({
    queryKey: CHAVE,
    queryFn: async () => avaliarStatus(await buscarEstadoFontes(), hojeEmSaoPaulo(new Date())),
  });
  return { aviso: data ?? null };
}
