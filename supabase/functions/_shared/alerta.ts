/**
 * Estado de cada fonte para o aviso público do site (T030, FR-027).
 *
 * Não há notificação ativa ao mantenedor (R15): estas funções só decidem se a fonte está com
 * problema e desde quando.
 */
import { dataEmSaoPaulo, diferencaEmDias } from "./data-serial.ts";

export type Fonte = "cadastro" | "precos";
export type TipoProblema = "falha" | "atraso";

export const ATRASO_PRECOS_DIAS = 14;
export const ATRASO_CADASTRO_DIAS = 8;
const DIA_MS = 86_400_000;

/** O que se sabe de uma fonte para avaliá-la. */
export type SituacaoFonte = {
  fonte: Fonte;
  /** Instante ISO da última execução bem-sucedida. */
  ultimaOkEm: string | null;
  /** Fim (AAAA-MM-DD) da edição mais recente incorporada; só para `precos`. */
  ultimaEdicaoFim: string | null;
  /** Resultado da última execução registrada, ou `null` se ainda não houve nenhuma. */
  ultimaExecucao: "ok" | "falha" | null;
};

export type Avaliacao = { problema: TipoProblema | null };

/** A linha de estado_fontes, em camelCase. */
export type EstadoFonte = {
  fonte: Fonte;
  ultimaOkEm: string | null;
  ultimaEdicaoFim: string | null;
  emProblema: boolean;
  tipoProblema: TipoProblema | null;
  problemaDesde: string | null;
};

export function avaliarFonte(situacao: SituacaoFonte, agora: Date): Avaliacao {
  if (situacao.ultimaExecucao === "falha") return { problema: "falha" };

  if (situacao.fonte === "precos") {
    if (!situacao.ultimaEdicaoFim) return { problema: "atraso" };
    const dias = diferencaEmDias(situacao.ultimaEdicaoFim, dataEmSaoPaulo(agora));
    return { problema: dias > ATRASO_PRECOS_DIAS ? "atraso" : null };
  }

  if (!situacao.ultimaOkEm) return { problema: "atraso" };
  const decorrido = agora.getTime() - Date.parse(situacao.ultimaOkEm);
  return { problema: decorrido > ATRASO_CADASTRO_DIAS * DIA_MS ? "atraso" : null };
}

/** O novo estado da fonte: liga o aviso, mantém a data de início ou desliga o aviso. */
export function transicaoEstado(anterior: EstadoFonte, avaliacao: Avaliacao, agora: Date): EstadoFonte {
  if (avaliacao.problema === null) {
    return { ...anterior, emProblema: false, tipoProblema: null, problemaDesde: null };
  }
  return {
    ...anterior,
    emProblema: true,
    tipoProblema: avaliacao.problema,
    problemaDesde: anterior.emProblema && anterior.problemaDesde ? anterior.problemaDesde : agora.toISOString(),
  };
}
