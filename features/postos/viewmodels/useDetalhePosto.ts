"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import type { DataISO } from "@/lib/formato";
import { montarDetalheVM, type DetalheVM } from "../domain/detalhe";
import { buscarDetalhePosto } from "../services/postos.service";
import { chaves } from "./chaves";
import { useHoje } from "./useHoje";

const UMA_HORA_MS = 3_600_000;

/**
 * Detalhe do posto (contracts/ui.md). Usa `useSuspenseQuery` com a mesma chave da hidratação feita
 * no servidor, então a página e o modal já chegam com os dados. `null` quando o posto não existe.
 */
export function useDetalhePosto(cnpj: string, hoje: DataISO): DetalheVM | null {
  const hojeAtual = useHoje(hoje);
  const { data } = useSuspenseQuery({
    queryKey: chaves.detalhePosto(cnpj),
    queryFn: () => buscarDetalhePosto(cnpj),
    staleTime: UMA_HORA_MS,
  });
  return data ? montarDetalheVM(data, hojeAtual) : null;
}
