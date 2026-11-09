import type { DataISO } from "@/lib/formato";
import { calcularIdade } from "./idade";
import type { PostoNoMapa } from "./tipos";
import { percentualComUmaCasa } from "./variacao";

/** Onde cada posto cai entre o mais barato (0) e o mais caro (1) da área. */
export type PontoRegua = { cnpj: string; posicao: number };

export type Regua = {
  menorMilesimos: number;
  maiorMilesimos: number;
  diferencaMilesimos: number;
  /** Diferença sobre o menor preço, com 1 casa decimal. */
  percentual: number;
  pontos: PontoRegua[];
};

/**
 * A régua de preços da área visível: do mais barato ao mais caro entre as coletas recentes (até
 * 28 dias). Usa o mesmo critério do "mais barato": coleta antiga e posto sem preço não entram; com
 * menos de duas coletas recentes, ou todas no mesmo preço, não há régua. Só coletas reais, sem
 * média (Princípio I).
 */
export function calcularRegua(postos: readonly PostoNoMapa[], hoje: DataISO): Regua | null {
  const recentes = postos.flatMap((p) =>
    p.coletaAtual && !calcularIdade(p.coletaAtual.data, hoje).antiga ? [{ cnpj: p.cnpj, preco: p.coletaAtual.precoMilesimos }] : [],
  );
  if (recentes.length < 2) return null;
  const precos = recentes.map((r) => r.preco);
  const menorMilesimos = Math.min(...precos);
  const maiorMilesimos = Math.max(...precos);
  if (menorMilesimos === maiorMilesimos) return null;
  const diferencaMilesimos = maiorMilesimos - menorMilesimos;
  return {
    menorMilesimos,
    maiorMilesimos,
    diferencaMilesimos,
    percentual: percentualComUmaCasa(diferencaMilesimos, menorMilesimos),
    pontos: recentes.map((r) => ({ cnpj: r.cnpj, posicao: (r.preco - menorMilesimos) / diferencaMilesimos })),
  };
}

/** Quanto um preço está acima do mais barato da área; `null` para o próprio mais barato ou sem régua. */
export function acimaDoMenor(regua: Regua | null, precoMilesimos: number): number | null {
  if (!regua || precoMilesimos <= regua.menorMilesimos) return null;
  return precoMilesimos - regua.menorMilesimos;
}
