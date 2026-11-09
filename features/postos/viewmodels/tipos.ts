/**
 * Tipos que os viewmodels entregam às views (contracts/ui.md). Os textos já vêm prontos e
 * formatados: as views não formatam nada (Princípios IV e VIII).
 */

import type { DirecaoVariacao } from "../domain/variacao";

export type { DirecaoVariacao };

export type EstadoCarga = "carregando" | "erro" | "pronto";

export type MarcadorVM = {
  cnpj: string;
  lng: number;
  lat: number;
  /** "R$ 6,59", ou `null` sem coleta ("sem preço"). */
  preco: string | null;
  /** "há 7 d", ou `null` sem coleta. */
  idade: string | null;
  /** Nome lido por leitores de tela, com a data completa da coleta. */
  nomeAcessivel: string;
  antigo: boolean;
  semPreco: boolean;
  /** Menor preço entre as coletas recentes da área visível. */
  maisBarato: boolean;
};

export type GrupoVM = {
  id: number;
  lng: number;
  lat: number;
  quantidade: number;
  zoomExpansao: number;
};

export type ItemListaVM = {
  cnpj: string;
  nome: string;
  /** Já como "bandeira não informada" quando nula. */
  bandeira: string;
  semPreco: boolean;
  /** "R$ 6,59". */
  preco?: string;
  /** "20/10/2026". */
  data?: string;
  /** "há 7 dias". */
  idade?: string;
  antiga: boolean;
  /** Fonte completa: "ANP – Levantamento de Preços de Combustíveis". */
  fonte?: string;
  /** Sigla da fonte para o espaço compacto: "ANP". */
  fonteCurta?: string;
  /** "+R$ 0,10 (+1,5%) desde 13/10/2026", ou `null` quando não há coleta anterior. */
  variacao: string | null;
  direcaoVariacao: DirecaoVariacao | null;
  maisBarato: boolean;
  /**
   * Quanto custa a mais que o mais barato da área ("+0,40", e o texto completo para leitores de
   * tela). `null` para o próprio mais barato, coleta antiga, sem preço ou sem régua.
   */
  acimaDoMaisBarato: { curto: string; acessivel: string } | null;
};

/** A régua de preços da área visível (identidade visual, padrão do seuimposto). */
export type ReguaVM = {
  /** "R$ 0,40". */
  diferenca: string;
  /** "6,5%". */
  percentual: string;
  /** "R$ 6,19". */
  menor: string;
  /** "R$ 6,59". */
  maior: string;
  /** Um ponto por coleta recente, de 0 (mais barato) a 1 (mais caro). */
  pontos: { cnpj: string; posicao: number; maisBarato: boolean }[];
  /** A régua inteira em uma frase, para leitores de tela. */
  descricao: string;
};

export type GrupoListaVM = {
  titulo: string;
  itens: ItemListaVM[];
};
