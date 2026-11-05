import { formatarData, formatarIdade, formatarPreco, type DataISO } from "@/lib/formato";
import { calcularIdade } from "./idade";
import type { PostoNoMapa } from "./tipos";

export const SEM_PRECO = "sem preço";
export const BANDEIRA_NAO_INFORMADA = "bandeira não informada";

/** A bandeira para exibição: nula ou vazia vira "bandeira não informada". */
export function bandeiraParaExibir(bandeira: string | null): string {
  const limpa = bandeira?.trim();
  return limpa ? limpa : BANDEIRA_NAO_INFORMADA;
}

/**
 * As duas partes do rótulo do marcador (FR-007), "R$ 6,59" e "há 7 d", que a identidade visual
 * mostra com pesos diferentes. Sem coleta, devolve `null`: o marcador mostra "sem preço" (FR-008).
 */
export function partesRotuloMarcador(posto: PostoNoMapa, hoje: DataISO): { preco: string; idade: string } | null {
  const coleta = posto.coletaAtual;
  if (!coleta) return null;
  return {
    preco: formatarPreco(coleta.precoMilesimos),
    idade: formatarIdade(calcularIdade(coleta.data, hoje), true),
  };
}

/**
 * Nome lido por leitores de tela, com a data completa da coleta (FR-007, Princípio I):
 * "NOME, BANDEIRA, gasolina comum R$ 6,59, coletado em 20/10/2026" ou "NOME, BANDEIRA, sem preço".
 * O "mais barato da área" também entra no nome, porque no marcador ele é verde e tem uma seta.
 */
export function nomeAcessivelMarcador(posto: PostoNoMapa, opcoes: { maisBarato?: boolean } = {}): string {
  const inicio = `${posto.nome}, ${bandeiraParaExibir(posto.bandeira)}`;
  const coleta = posto.coletaAtual;
  if (!coleta) return `${inicio}, ${SEM_PRECO}`;
  const nome = `${inicio}, gasolina comum ${formatarPreco(coleta.precoMilesimos)}, coletado em ${formatarData(coleta.data)}`;
  return opcoes.maisBarato ? `${nome}, mais barato da área` : nome;
}
