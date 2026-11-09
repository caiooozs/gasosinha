import type { DataISO } from "@/lib/formato";
import type { PrecoDatado } from "./tipos";

/** Direção da variação desde a coleta anterior: decide a cor e o ícone do selo. */
export type DirecaoVariacao = "subiu" | "caiu" | "igual";

export type Variacao = {
  diferencaMilesimos: number;
  /** Percentual com 1 casa decimal, arredondado para longe do zero. */
  percentual: number;
  /** Data da coleta anterior, para a pessoa saber o período comparado. */
  desde: DataISO;
};

/**
 * Variação entre a coleta mais recente e a imediatamente anterior (FR-010, FR-015). Sem coleta
 * anterior, devolve `null`: não há variação, nem mesmo zero (FR-016).
 *
 * O percentual é calculado com inteiros: décimos de ponto percentual = diferença × 1000 / anterior,
 * arredondado para longe do zero.
 */
export function calcularVariacao(atual: PrecoDatado, anterior?: PrecoDatado): Variacao | null {
  if (!anterior) return null;
  const diferencaMilesimos = atual.precoMilesimos - anterior.precoMilesimos;
  return { diferencaMilesimos, percentual: percentualComUmaCasa(diferencaMilesimos, anterior.precoMilesimos), desde: anterior.data };
}

/**
 * Diferença em relação a uma base, em %, com 1 casa decimal arredondada para longe do zero. Só
 * com inteiros: décimos de ponto percentual = round(|diferença| × 1000 / base).
 */
export function percentualComUmaCasa(diferencaMilesimos: number, baseMilesimos: number): number {
  const numerador = Math.abs(diferencaMilesimos) * 1000;
  // round(n / base) com meio para cima, só com inteiros: floor((2n + base) / 2base).
  const decimos = Math.floor((2 * numerador + baseMilesimos) / (2 * baseMilesimos));
  return decimos === 0 ? 0 : (Math.sign(diferencaMilesimos) * decimos) / 10;
}

export function direcaoDaVariacao(variacao: Variacao): DirecaoVariacao {
  if (variacao.diferencaMilesimos > 0) return "subiu";
  if (variacao.diferencaMilesimos < 0) return "caiu";
  return "igual";
}
