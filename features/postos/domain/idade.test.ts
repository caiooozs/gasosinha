import { describe, expect, it } from "vitest";
import { calcularIdade } from "./idade";

const HOJE = "2026-10-27";

/** A data `dias` antes de HOJE, sem `new Date('AAAA-MM-DD')`. */
function diasAtras(dias: number): string {
  const d = new Date(Date.UTC(2026, 9, 27) - dias * 86_400_000);
  return d.toISOString().slice(0, 10);
}

describe("calcularIdade", () => {
  it("0 dia → dias, 0", () => {
    expect(calcularIdade(HOJE, HOJE)).toEqual({ dias: 0, unidade: "dias", valor: 0, antiga: false });
  });

  it("7 dias → { dias, 7, antiga: false }", () => {
    expect(calcularIdade("2026-10-20", HOJE)).toEqual({ dias: 7, unidade: "dias", valor: 7, antiga: false });
  });

  it("13 dias ainda é contado em dias", () => {
    expect(calcularIdade(diasAtras(13), HOJE)).toMatchObject({ unidade: "dias", valor: 13 });
  });

  it("14 dias → 2 semanas", () => {
    expect(calcularIdade(diasAtras(14), HOJE)).toMatchObject({ unidade: "semanas", valor: 2, antiga: false });
  });

  it("28 dias não é antiga; 29 dias é", () => {
    expect(calcularIdade(diasAtras(28), HOJE)).toMatchObject({ dias: 28, antiga: false });
    expect(calcularIdade(diasAtras(29), HOJE)).toMatchObject({ dias: 29, antiga: true });
  });

  it("35 dias → 5 semanas", () => {
    expect(calcularIdade(diasAtras(35), HOJE)).toMatchObject({ unidade: "semanas", valor: 5 });
  });

  it("84 dias → 12 semanas; 85 dias → 2 meses (floor(dias/30))", () => {
    expect(calcularIdade(diasAtras(84), HOJE)).toMatchObject({ unidade: "semanas", valor: 12 });
    expect(calcularIdade(diasAtras(85), HOJE)).toMatchObject({ unidade: "meses", valor: 2 });
  });

  it("22/09/2026 a 27/10/2026 → 5 semanas e antiga", () => {
    expect(calcularIdade("2026-09-22", "2026-10-27")).toEqual({
      dias: 35,
      unidade: "semanas",
      valor: 5,
      antiga: true,
    });
  });

  it("uma coleta com data futura (relógio adiantado da fonte) conta como hoje", () => {
    expect(calcularIdade("2026-10-28", HOJE)).toMatchObject({ dias: 0, unidade: "dias", valor: 0 });
  });
});
