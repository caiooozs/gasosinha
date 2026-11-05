import { describe, expect, it } from "vitest";
import { calcularVariacao } from "./variacao";

const FONTE = "ANP – Levantamento de Preços de Combustíveis";
const coleta = (data: string, precoMilesimos: number) => ({ data, precoMilesimos, fonte: FONTE });

describe("calcularVariacao", () => {
  it("6490 → 6590 = +100 milésimos, +1,5%, desde a coleta anterior", () => {
    expect(calcularVariacao(coleta("2026-10-20", 6590), coleta("2026-10-13", 6490))).toEqual({
      diferencaMilesimos: 100,
      percentual: 1.5,
      desde: "2026-10-13",
    });
  });

  it("6590 → 6390 = −200 milésimos, −3,0%", () => {
    expect(calcularVariacao(coleta("2026-10-20", 6390), coleta("2026-10-13", 6590))).toEqual({
      diferencaMilesimos: -200,
      percentual: -3,
      desde: "2026-10-13",
    });
  });

  it("preços iguais → zero, sem −0", () => {
    const v = calcularVariacao(coleta("2026-10-20", 6590), coleta("2026-10-13", 6590));
    expect(v).toEqual({ diferencaMilesimos: 0, percentual: 0, desde: "2026-10-13" });
    expect(Object.is(v!.percentual, -0)).toBe(false);
  });

  it("sem coleta anterior → null (FR-016)", () => {
    expect(calcularVariacao(coleta("2026-10-20", 6590))).toBeNull();
    expect(calcularVariacao(coleta("2026-10-20", 6590), undefined)).toBeNull();
  });

  it("arredonda o percentual a 1 casa, para longe do zero", () => {
    // 5 / 1000 = 0,5% exato; 25 / 10000 milésimos... casos de meio exato:
    expect(calcularVariacao(coleta("b", 1005), coleta("a", 1000))!.percentual).toBe(0.5);
    // +0,25% → +0,3%; −0,25% → −0,3%
    expect(calcularVariacao(coleta("b", 4010), coleta("a", 4000))!.percentual).toBe(0.3);
    expect(calcularVariacao(coleta("b", 3990), coleta("a", 4000))!.percentual).toBe(-0.3);
  });

  it("uma queda pequena que arredonda para zero dá 0, sem −0", () => {
    const v = calcularVariacao(coleta("b", 6589), coleta("a", 6590))!;
    expect(v.diferencaMilesimos).toBe(-1);
    expect(Object.is(v.percentual, -0)).toBe(false);
    expect(v.percentual).toBe(0);
  });
});
