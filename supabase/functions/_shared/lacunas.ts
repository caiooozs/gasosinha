/**
 * Semanas faltando na janela do histórico (T081). ÁREA SENSÍVEL (Princípio IX).
 *
 * Em vez de supor em que dia da semana cada edição do LPC começa, procura os dias da janela que
 * nenhum período coberto inclui e os agrupa em intervalos contínuos. Sem APIs de Deno nem de Node.
 */
import type { Periodo } from "./data-serial.ts";

const DIA_MS = 86_400_000;

function emDias(data: string): number {
  const [ano, mes, dia] = data.split("-").map(Number);
  return Date.UTC(ano, mes - 1, dia) / DIA_MS;
}

function deDias(dias: number): string {
  return new Date(dias * DIA_MS).toISOString().slice(0, 10);
}

/** Intervalos de dias, entre `desde` e `ate` (inclusive), que nenhum período de `cobertos` inclui. */
export function lacunasNaJanela(cobertos: readonly Periodo[], desde: string, ate: string): Periodo[] {
  const inicio = emDias(desde);
  const fim = emDias(ate);
  const ordenados = cobertos
    .map((p) => [emDias(p.inicio), emDias(p.fim)] as const)
    .filter(([a, b]) => b >= inicio && a <= fim)
    .sort((x, y) => x[0] - y[0]);

  const lacunas: Periodo[] = [];
  let proximoDescoberto = inicio;
  for (const [a, b] of ordenados) {
    if (a > proximoDescoberto) lacunas.push({ inicio: deDias(proximoDescoberto), fim: deDias(Math.min(a - 1, fim)) });
    proximoDescoberto = Math.max(proximoDescoberto, b + 1);
    if (proximoDescoberto > fim) break;
  }
  if (proximoDescoberto <= fim) lacunas.push({ inicio: deDias(proximoDescoberto), fim: deDias(fim) });
  return lacunas;
}
