/**
 * Tipos que os viewmodels entregam às views (contracts/ui.md). Os textos já vêm prontos e
 * formatados: as views não formatam nada (Princípios IV e VIII).
 */

export type EstadoCarga = "carregando" | "erro" | "pronto";

export type MarcadorVM = {
  cnpj: string;
  lng: number;
  lat: number;
  /** "R$ 6,59 · há 7 d" ou "sem preço". */
  rotulo: string;
  /** Nome lido por leitores de tela, com a data completa da coleta. */
  nomeAcessivel: string;
  antigo: boolean;
  semPreco: boolean;
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
  fonte?: string;
  /** "+R$ 0,10 (+1,5%) desde 13/10/2026", ou `null` quando não há coleta anterior. */
  variacao: string | null;
};

export type GrupoListaVM = {
  titulo: string;
  itens: ItemListaVM[];
};
