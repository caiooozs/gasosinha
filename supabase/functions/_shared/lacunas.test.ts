import { describe, expect, it } from "vitest";
import { lacunasNaJanela } from "./lacunas.ts";

const semana = (inicio: string, fim: string) => ({ inicio, fim });

describe("lacunasNaJanela", () => {
  it("janela toda coberta → sem lacunas", () => {
    const cobertos = [semana("2026-10-04", "2026-10-10"), semana("2026-10-11", "2026-10-17"), semana("2026-10-18", "2026-10-24")];
    expect(lacunasNaJanela(cobertos, "2026-10-04", "2026-10-24")).toEqual([]);
  });

  it("semana faltando no meio → essa semana", () => {
    const cobertos = [semana("2026-10-04", "2026-10-10"), semana("2026-10-18", "2026-10-24")];
    expect(lacunasNaJanela(cobertos, "2026-10-04", "2026-10-24")).toEqual([semana("2026-10-11", "2026-10-17")]);
  });

  it("começo e fim da janela sem edição → lacunas nas pontas", () => {
    const cobertos = [semana("2026-10-11", "2026-10-17")];
    expect(lacunasNaJanela(cobertos, "2026-10-07", "2026-10-21")).toEqual([
      semana("2026-10-07", "2026-10-10"),
      semana("2026-10-18", "2026-10-21"),
    ]);
  });

  it("períodos repetidos, sobrepostos ou fora da janela não atrapalham", () => {
    const cobertos = [
      semana("2026-09-27", "2026-10-03"),
      semana("2026-10-04", "2026-10-10"),
      semana("2026-10-04", "2026-10-10"),
      semana("2026-10-08", "2026-10-17"),
      semana("2026-11-01", "2026-11-07"),
    ];
    expect(lacunasNaJanela(cobertos, "2026-10-01", "2026-10-20")).toEqual([semana("2026-10-18", "2026-10-20")]);
  });

  it("nada coberto → a janela inteira", () => {
    expect(lacunasNaJanela([], "2026-10-01", "2026-10-05")).toEqual([semana("2026-10-01", "2026-10-05")]);
  });

  it("atravessa a virada de mês e de ano", () => {
    expect(lacunasNaJanela([semana("2026-01-01", "2026-01-31")], "2025-12-30", "2026-02-02")).toEqual([
      semana("2025-12-30", "2025-12-31"),
      semana("2026-02-01", "2026-02-02"),
    ]);
  });
});
