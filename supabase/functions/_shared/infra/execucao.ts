/**
 * Partes comuns às duas Edge Functions (T033). ÁREA SENSÍVEL (Princípio IX).
 *
 * Recebe o banco e o ambiente por parâmetro: nada aqui lê `Deno.env`.
 */
import { avaliarFonte, transicaoEstado, type EstadoFonte } from "../alerta.ts";
import type { BancoGasosinha, Execucao } from "./banco.ts";

export type Resposta = { status: number; corpo: Record<string, unknown> };

/** Compara o cabeçalho x-cron-secret com o segredo esperado, em tempo constante. */
export function verificarSegredoCron(recebido: string | null, esperado: string): boolean {
  if (!esperado) return false;
  const codificador = new TextEncoder();
  const a = codificador.encode(recebido ?? "");
  const b = codificador.encode(esperado);
  let diferenca = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) diferenca |= (a[i] ?? 0) ^ b[i];
  return diferenca === 0;
}

/** Recusa o que não é POST (405) ou não traz o segredo certo (401). `null` quando pode seguir. */
export function recusarRequisicao(metodo: string, segredo: string | null, esperado: string): Resposta | null {
  if (metodo !== "POST") return { status: 405, corpo: { ok: false, erro: "metodo_nao_permitido" } };
  if (!verificarSegredoCron(segredo, esperado)) return { status: 401, corpo: { ok: false, erro: "nao_autorizado" } };
  return null;
}

export async function registrarExecucao(banco: BancoGasosinha, execucao: Execucao): Promise<void> {
  await banco.registrarExecucao(execucao);
}

/**
 * Reavalia as duas fontes e grava o novo estado de cada uma, que liga e desliga o aviso público do
 * site (FR-027). Cada execução avalia as duas, para que o atraso de uma seja detectado mesmo que o
 * agendamento dela pare.
 */
export async function reavaliarFontes(banco: BancoGasosinha, agora: Date): Promise<EstadoFonte[]> {
  const estados = await banco.lerEstadoFontes();
  const novos: EstadoFonte[] = [];
  for (const estado of estados) {
    const ultimaExecucao = await banco.ultimaExecucao(estado.fonte);
    const avaliacao = avaliarFonte(
      { fonte: estado.fonte, ultimaOkEm: estado.ultimaOkEm, ultimaEdicaoFim: estado.ultimaEdicaoFim, ultimaExecucao },
      agora,
    );
    const novo = transicaoEstado(estado, avaliacao, agora);
    if (
      novo.emProblema !== estado.emProblema ||
      novo.tipoProblema !== estado.tipoProblema ||
      novo.problemaDesde !== estado.problemaDesde
    ) {
      await banco.gravarProblemaDaFonte(novo);
    }
    novos.push(novo);
  }
  return novos;
}

/** Fonte externa fora do ar ou respondendo com erro HTTP (resposta 502). */
export class FonteIndisponivelError extends Error {
  constructor(detalhe: string) {
    super(detalhe);
    this.name = "FonteIndisponivelError";
  }
}

/** Mensagem curta do erro para `execucoes_sync.detalhe`, sem segredos. */
export function descreverErro(erro: unknown): string {
  return erro instanceof Error ? `${erro.name}: ${erro.message}`.slice(0, 1000) : "erro desconhecido";
}

/** Registra a execução e reavalia as fontes sem deixar uma falha aqui esconder a resposta. */
export async function encerrarExecucao(banco: BancoGasosinha, execucao: Execucao, agora: Date): Promise<void> {
  try {
    await registrarExecucao(banco, execucao);
    await reavaliarFontes(banco, agora);
  } catch (erro) {
    console.error(`falha ao encerrar a execução de ${execucao.fonte}: ${descreverErro(erro)}`);
  }
}
