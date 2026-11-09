import { describe, expect, it } from "vitest";
import { montarGrafico, variacoesEntreColetas } from "./historico";

const FONTE = "ANP – Levantamento de Preços de Combustíveis";
const coleta = (data: string, precoMilesimos: number) => ({ data, precoMilesimos, fonte: FONTE });

// Da mais recente para a mais antiga, como vem do RPC.
const coletas = [
  coleta("2026-10-20", 6590),
  coleta("2026-10-13", 6490),
  coleta("2026-10-06", 6550),
  coleta("2026-09-29", 6550),
  coleta("2026-09-22", 6470),
  coleta("2026-09-15", 6390),
];

describe("montarGrafico", () => {
  const grafico = montarGrafico(coletas);

  it("os pontos vêm em ordem cronológica, igualmente espaçados de 0 a 1", () => {
    expect(grafico?.pontos.map((p) => p.data)).toEqual([
      "2026-09-15",
      "2026-09-22",
      "2026-09-29",
      "2026-10-06",
      "2026-10-13",
      "2026-10-20",
    ]);
    expect(grafico?.pontos.map((p) => p.x)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
  });

  it("a altura acompanha o preço, dentro de 0 a 1, com folga em cima e embaixo", () => {
    const ys = grafico?.pontos.map((p) => p.y) ?? [];
    expect(Math.min(...ys)).toBeGreaterThan(0);
    expect(Math.max(...ys)).toBeLessThan(1);
    // 6390 é o mais baixo e 6590 o mais alto.
    expect(ys[0]).toBe(Math.min(...ys));
    expect(ys[5]).toBe(Math.max(...ys));
    // Preços iguais, alturas iguais.
    expect(ys[2]).toBe(ys[3]);
  });

  it("a referência é a coleta anterior, base da variação mostrada", () => {
    expect(grafico?.referencia.precoMilesimos).toBe(6490);
    expect(grafico?.referencia.y).toBe(grafico?.pontos[4].y);
  });

  it("as marcas do eixo são valores redondos dentro da faixa, no máximo 3", () => {
    expect(grafico?.marcas.map((m) => m.precoMilesimos)).toEqual([6400, 6500, 6600]);
    for (const marca of grafico?.marcas ?? []) {
      expect(marca.y).toBeGreaterThan(0);
      expect(marca.y).toBeLessThan(1);
    }
  });

  it("mostra só as coletas mais recentes quando há muitas", () => {
    const muitas = Array.from({ length: 12 }, (_, i) => coleta(`2026-10-${String(20 - i).padStart(2, "0")}`, 6500 + i));
    const curto = montarGrafico(muitas, 8);
    expect(curto?.pontos).toHaveLength(8);
    expect(curto?.pontos.at(-1)?.data).toBe("2026-10-20");
  });

  it("todas no mesmo preço: linha reta no meio, com marca", () => {
    const iguais = montarGrafico([coleta("2026-10-20", 6590), coleta("2026-10-13", 6590)]);
    expect(iguais?.pontos.map((p) => p.y)).toEqual([0.5, 0.5]);
    expect(iguais?.marcas.length).toBeGreaterThan(0);
  });

  it("com menos de duas coletas não há gráfico", () => {
    expect(montarGrafico([coleta("2026-10-20", 6590)])).toBeNull();
    expect(montarGrafico([])).toBeNull();
  });
});

describe("variacoesEntreColetas", () => {
  it("a diferença de cada coleta para a anterior, das mais antigas para a mais recente", () => {
    expect(variacoesEntreColetas(coletas, 5)).toEqual([
      { data: "2026-09-22", diferencaMilesimos: 80 },
      { data: "2026-09-29", diferencaMilesimos: 80 },
      { data: "2026-10-06", diferencaMilesimos: 0 },
      { data: "2026-10-13", diferencaMilesimos: -60 },
      { data: "2026-10-20", diferencaMilesimos: 100 },
    ]);
  });

  it("limita às mais recentes", () => {
    expect(variacoesEntreColetas(coletas, 2).map((v) => v.data)).toEqual(["2026-10-13", "2026-10-20"]);
  });

  it("com menos de duas coletas não há variação", () => {
    expect(variacoesEntreColetas([coleta("2026-10-20", 6590)], 5)).toEqual([]);
  });
});
