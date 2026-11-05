/**
 * Tipos que os viewmodels entregam às views (contracts/ui.md). Os textos já vêm prontos e
 * formatados: as views não formatam nada (Princípios IV e VIII).
 */

export type EstadoCarga = "carregando" | "erro" | "pronto";

/** Direção da variação desde a coleta anterior: decide a cor e o ícone do selo. */
export type DirecaoVariacao = "subiu" | "caiu" | "igual";

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
};

export type GrupoListaVM = {
  titulo: string;
  itens: ItemListaVM[];
};
