/**
 * Regras puras da gravação de preços (T031): o lote contra o que já está gravado e a decisão
 * sobre a edição.
 */
import type { Periodo } from "./data-serial.ts";
import type { LinhaLpcValida } from "./schemas.ts";

export type ColetaExistente = { cnpj: string; dataColeta: string; precoMilesimos: number };

export type ResultadoLote = {
  /** Linhas a gravar (inclui as de CNPJ sem posto, que ficam guardadas: FR-024). */
  novas: LinhaLpcValida[];
  /** Linhas iguais às já gravadas. */
  jaExistentes: number;
  /** Linhas com a mesma chave de uma coleta gravada, mas outro preço. O valor gravado é mantido. */
  conflitos: { linha: number; motivo: "conflito_com_existente" }[];
  /** Linhas cujo CNPJ não está em `postos`. */
  semPosto: number;
};

const chave = (cnpj: string, data: string) => `${cnpj}|${data}`;

export function classificarLote(
  validas: readonly LinhaLpcValida[],
  existentes: readonly ColetaExistente[],
  cnpjsCadastrados: ReadonlySet<string>,
): ResultadoLote {
  const gravados = new Map(existentes.map((e) => [chave(e.cnpj, e.dataColeta), e.precoMilesimos]));
  const resultado: ResultadoLote = { novas: [], jaExistentes: 0, conflitos: [], semPosto: 0 };

  for (const linha of validas) {
    const gravado = gravados.get(chave(linha.cnpj, linha.dataColeta));
    if (gravado !== undefined && gravado !== linha.precoMilesimos) {
      resultado.conflitos.push({ linha: linha.linha, motivo: "conflito_com_existente" });
      continue;
    }
    if (gravado !== undefined) resultado.jaExistentes++;
    else resultado.novas.push(linha);
    if (!cnpjsCadastrados.has(linha.cnpj)) resultado.semPosto++;
  }
  return resultado;
}

export type StatusEdicao = "em_andamento" | "concluida" | "fora_da_janela";
export type DecisaoEdicao = "nova" | "retomar" | "ja_processada" | "fora_da_janela";

/** O que fazer com o arquivo de um período, dada a edição já registrada (se houver). */
export function decidirEdicao(entrada: {
  existente: { status: StatusEdicao } | null;
  periodo: Periodo;
  janelaDesde: string;
}): DecisaoEdicao {
  const { existente, periodo, janelaDesde } = entrada;
  if (existente?.status === "concluida" || existente?.status === "fora_da_janela") return "ja_processada";
  if (periodo.fim < janelaDesde) return "fora_da_janela";
  if (existente?.status === "em_andamento") return "retomar";
  return "nova";
}
