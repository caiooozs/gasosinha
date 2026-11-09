"use client";

import { textoMostrarMais } from "../domain/paginar";
import type { MostrarMaisVM } from "./tipos";
import { usePaginacao } from "./usePaginacao";

/** Quantas coletas o detalhe mostra de início e quantas cada "Mostrar mais" acrescenta (D2). */
const COLETAS_INICIAIS = 6;
const COLETAS_POR_CLIQUE = 10;
const NOME_COLETAS = { singular: "coleta", plural: "coletas", feminino: true };

export type HistoricoPaginadoVM = {
  /** Quantas coletas da lista, da mais recente para a mais antiga, estão à vista. */
  visiveis: number;
  /** `null` quando todas já estão à vista. */
  mostrarMais: MostrarMaisVM | null;
};

/**
 * A paginação de "Todas as coletas" no detalhe (D2): as 6 mais recentes e mais 10 a cada clique.
 * Todas continuam acessíveis (FR-014). Outro posto começa de novo pelas 6 primeiras.
 */
export function useHistoricoPaginado(cnpj: string, total: number): HistoricoPaginadoVM {
  const { quantidade, mostrarMais } = usePaginacao(cnpj, COLETAS_INICIAIS, COLETAS_POR_CLIQUE);
  const visiveis = Math.min(quantidade, total);
  const restantes = total - visiveis;
  return {
    visiveis,
    mostrarMais:
      restantes > 0 ? { texto: textoMostrarMais(restantes, COLETAS_POR_CLIQUE, NOME_COLETAS), onMostrarMais: mostrarMais } : null,
  };
}
