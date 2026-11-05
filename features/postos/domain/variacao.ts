import type { DataISO } from "@/lib/formato";
import type { PrecoDatado } from "./tipos";

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
  const numerador = Math.abs(diferencaMilesimos) * 1000;
  const base = anterior.precoMilesimos;
  // round(n / base) com meio para cima, só com inteiros: floor((2n + base) / 2base).
  const decimos = Math.floor((2 * numerador + base) / (2 * base));
  const percentual = decimos === 0 ? 0 : (Math.sign(diferencaMilesimos) * decimos) / 10;
  return { diferencaMilesimos, percentual, desde: anterior.data };
}
