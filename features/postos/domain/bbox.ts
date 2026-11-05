import { RMR_LIMITES } from "@/supabase/functions/_shared/regiao-rmr";
import type { Bbox, PostoNoMapa } from "./tipos";

/** Área já arredondada para fora na grade de 0,02° (R13). */
export type BboxQuantizada = Bbox;

/** Passos da grade por grau: 0,02° = 1/50. */
const PASSOS_POR_GRAU = 50;
/** Folga em volta da RMR, igual à usada na ingestão para aceitar uma coordenada (`dentroDaRmr`). */
const MARGEM_RMR = 0.05;

/**
 * `valor` em passos da grade. Um valor que já está na grade (ex.: -34.92 → -1746.0000000000002)
 * volta ao inteiro, para não ser expandido mais uma vez pelo floor/ceil.
 */
function emPassos(valor: number): number {
  const passos = valor * PASSOS_POR_GRAU;
  const inteiro = Math.round(passos);
  return Math.abs(passos - inteiro) < 1e-9 ? inteiro : passos;
}

/** Divisão de inteiros por 100: devolve exatamente o mesmo número que o literal (ex.: -34.92). */
const deCentesimos = (passos: number) => (passos * 2) / 100;
const paraBaixo = (valor: number) => Math.floor(emPassos(valor));
const paraCima = (valor: number) => Math.ceil(emPassos(valor));

const LIMITE_OESTE = paraBaixo(RMR_LIMITES[0] - MARGEM_RMR);
const LIMITE_SUL = paraBaixo(RMR_LIMITES[1] - MARGEM_RMR);
const LIMITE_LESTE = paraCima(RMR_LIMITES[2] + MARGEM_RMR);
const LIMITE_NORTE = paraCima(RMR_LIMITES[3] + MARGEM_RMR);

/**
 * Expande a área visível para fora na grade de 0,02° e a recorta no retângulo da RMR com margem.
 * A conta é feita em passos inteiros da grade, sem erro de ponto flutuante. Devolve `null` quando
 * a área cai toda fora da RMR: não há o que consultar.
 *
 * É a única área que sai do aparelho (Princípio III, R13).
 */
export function quantizarBbox([oeste, sul, leste, norte]: Bbox): BboxQuantizada | null {
  const o = Math.max(paraBaixo(oeste), LIMITE_OESTE);
  const s = Math.max(paraBaixo(sul), LIMITE_SUL);
  const l = Math.min(paraCima(leste), LIMITE_LESTE);
  const n = Math.min(paraCima(norte), LIMITE_NORTE);
  if (!(o < l && s < n)) return null;
  return [deCentesimos(o), deCentesimos(s), deCentesimos(l), deCentesimos(n)];
}

/** Só os postos dentro da área visível de fato, sem a margem da quantização; a borda conta. */
export function filtrarNaAreaVisivel<T extends Pick<PostoNoMapa, "lat" | "lng">>(
  postos: readonly T[],
  [oeste, sul, leste, norte]: Bbox,
): T[] {
  return postos.filter((p) => p.lng >= oeste && p.lng <= leste && p.lat >= sul && p.lat <= norte);
}
