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

/** Rótulo do marcador (FR-007, FR-008): "R$ 6,59 · há 7 d" ou "sem preço". */
export function rotuloMarcador(posto: PostoNoMapa, hoje: DataISO): string {
  const coleta = posto.coletaAtual;
  if (!coleta) return SEM_PRECO;
  return `${formatarPreco(coleta.precoMilesimos)} · ${formatarIdade(calcularIdade(coleta.data, hoje), true)}`;
}

/**
 * Nome lido por leitores de tela, com a data completa da coleta (FR-007, Princípio I):
 * "NOME, BANDEIRA, gasolina comum R$ 6,59, coletado em 20/10/2026" ou "NOME, BANDEIRA, sem preço".
 */
export function nomeAcessivelMarcador(posto: PostoNoMapa, hoje: DataISO): string {
  void hoje; // a idade já aparece no rótulo; o nome acessível leva a data completa.
  const inicio = `${posto.nome}, ${bandeiraParaExibir(posto.bandeira)}`;
  const coleta = posto.coletaAtual;
  if (!coleta) return `${inicio}, ${SEM_PRECO}`;
  return `${inicio}, gasolina comum ${formatarPreco(coleta.precoMilesimos)}, coletado em ${formatarData(coleta.data)}`;
}
