import type { DataISO } from "@/lib/formato";
import type { PrecoDatado } from "./tipos";

/** Um ponto do gráfico: `x` e `y` vão de 0 a 1 (`y` maior é preço maior). */
export type PontoGrafico = { data: DataISO; precoMilesimos: number; x: number; y: number };

export type MarcaEixo = { precoMilesimos: number; y: number };

export type Grafico = {
  /** Da coleta mais antiga para a mais recente. */
  pontos: PontoGrafico[];
  /** Valores redondos do eixo de preço, de baixo para cima. */
  marcas: MarcaEixo[];
  /** A coleta anterior à mais recente: a base da variação mostrada no detalhe. */
  referencia: MarcaEixo;
};

// Passos possíveis entre as marcas do eixo, em milésimos (R$ 0,01 a R$ 1,00).
const PASSOS = [10, 20, 50, 100, 200, 500, 1000];
const MAXIMO_MARCAS = 3;
// Folga acima e abaixo dos preços: 15% da faixa, e no mínimo R$ 0,02.
const FOLGA_RELATIVA = 0.15;
const FOLGA_MINIMA = 20;

function marcasDoEixo(minimo: number, maximo: number): number[] {
  const multiplos = (passo: number) => {
    const valores: number[] = [];
    for (let v = Math.ceil(minimo / passo) * passo; v <= maximo; v += passo) valores.push(v);
    return valores;
  };
  // O menor passo que dá de 2 a 3 marcas; se nenhum der, o primeiro que dá ao menos uma.
  for (const passo of PASSOS) {
    const valores = multiplos(passo);
    if (valores.length >= 2 && valores.length <= MAXIMO_MARCAS) return valores;
  }
  for (const passo of PASSOS) {
    const valores = multiplos(passo);
    if (valores.length >= 1 && valores.length <= MAXIMO_MARCAS) return valores;
  }
  return [];
}

/**
 * O gráfico em degraus do histórico (identidade visual, padrão do seuimposto): as coletas mais
 * recentes, igualmente espaçadas, com o preço na altura. Só coletas reais: entre duas coletas o
 * preço é desenhado como degrau, nunca interpolado (Princípio I). Precisa de pelo menos duas
 * coletas. `coletas` vem da mais recente para a mais antiga, como no RPC.
 */
export function montarGrafico(coletas: readonly PrecoDatado[], maximoPontos = 8): Grafico | null {
  if (coletas.length < 2) return null;
  const cronologicas = coletas.slice(0, maximoPontos).reverse();
  const precos = cronologicas.map((c) => c.precoMilesimos);
  const menor = Math.min(...precos);
  const maior = Math.max(...precos);
  const folga = Math.max((maior - menor) * FOLGA_RELATIVA, FOLGA_MINIMA);
  const base = menor - folga;
  const faixa = maior + folga - base;
  const altura = (preco: number) => (preco - base) / faixa;
  const ultimo = cronologicas.length - 1;

  const pontos = cronologicas.map((c, i) => ({
    data: c.data,
    precoMilesimos: c.precoMilesimos,
    x: Math.round((i / ultimo) * 1000) / 1000,
    y: altura(c.precoMilesimos),
  }));
  const anterior = cronologicas[ultimo - 1];
  return {
    pontos,
    marcas: marcasDoEixo(base, maior + folga).map((precoMilesimos) => ({ precoMilesimos, y: altura(precoMilesimos) })),
    referencia: { precoMilesimos: anterior.precoMilesimos, y: altura(anterior.precoMilesimos) },
  };
}

/** A variação de cada coleta para a imediatamente anterior, das mais antigas para a mais recente. */
export function variacoesEntreColetas(
  coletas: readonly PrecoDatado[],
  maximo: number,
): { data: DataISO; diferencaMilesimos: number }[] {
  const variacoes: { data: DataISO; diferencaMilesimos: number }[] = [];
  for (let i = 0; i < coletas.length - 1 && variacoes.length < maximo; i++) {
    variacoes.push({ data: coletas[i].data, diferencaMilesimos: coletas[i].precoMilesimos - coletas[i + 1].precoMilesimos });
  }
  return variacoes.reverse();
}
