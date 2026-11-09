import { describe, expect, it } from "vitest";
import { classificarReacao, textoReacao } from "./reacao";

/** O Intl separa "R$" do valor com um espaço inseparável. */
const NBSP = " ";
const coleta = (data: string, precoMilesimos: number) => ({ data, precoMilesimos });

describe("classificarReacao (FR-018)", () => {
  it("preço mais recente maior que o anterior: subiu", () => {
    expect(classificarReacao(coleta("2026-10-20", 6590), coleta("2026-10-13", 6490))).toBe("subiu");
  });

  it("preço mais recente menor que o anterior: caiu", () => {
    expect(classificarReacao(coleta("2026-10-20", 6390), coleta("2026-10-13", 6590))).toBe("caiu");
  });

  it("preço igual ao anterior: estável", () => {
    expect(classificarReacao(coleta("2026-10-20", 6490), coleta("2026-10-13", 6490))).toBe("estavel");
  });

  it("um milésimo de diferença já conta como variação", () => {
    expect(classificarReacao(coleta("2026-10-20", 6491), coleta("2026-10-13", 6490))).toBe("subiu");
    expect(classificarReacao(coleta("2026-10-20", 6489), coleta("2026-10-13", 6490))).toBe("caiu");
  });

  it("sem coleta anterior, ou sem nenhuma coleta: neutro", () => {
    expect(classificarReacao(coleta("2026-10-20", 6590), undefined)).toBe("neutro");
    expect(classificarReacao(undefined, undefined)).toBe("neutro");
    expect(classificarReacao(undefined, coleta("2026-10-13", 6490))).toBe("neutro");
  });
});

describe("textoReacao (FR-019)", () => {
  it("subiu: diferença em R$, percentual com sinal e a data da coleta anterior", () => {
    expect(textoReacao("subiu", { diferencaMilesimos: 100, percentual: 1.5, desde: "2026-10-13" }, true)).toBe(
      `Subiu R$${NBSP}0,10 (+1,5%) desde 13/10/2026`,
    );
  });

  it("caiu: a diferença vem sem sinal no valor e com o sinal de menos no percentual", () => {
    expect(textoReacao("caiu", { diferencaMilesimos: -200, percentual: -3, desde: "2026-10-13" }, true)).toBe(
      `Caiu R$${NBSP}0,20 (−3,0%) desde 13/10/2026`,
    );
  });

  it("diferença com 3 casas aparece com 3 casas, como o preço", () => {
    expect(textoReacao("subiu", { diferencaMilesimos: 15, percentual: 0.2, desde: "2026-10-13" }, true)).toBe(
      `Subiu R$${NBSP}0,015 (+0,2%) desde 13/10/2026`,
    );
  });

  it("estável: mesmo preço, com a data da coleta anterior", () => {
    expect(textoReacao("estavel", { diferencaMilesimos: 0, percentual: 0, desde: "2026-10-13" }, true)).toBe(
      "Mesmo preço da coleta de 13/10/2026",
    );
  });

  it("neutro com preço: explica que não há com o que comparar", () => {
    expect(textoReacao("neutro", null, true)).toBe("Ainda não há coleta anterior para comparar");
  });

  it("neutro sem preço", () => {
    expect(textoReacao("neutro", null, false)).toBe("Sem preço coletado");
  });

  it("sem variação, qualquer reação cai no texto neutro, sem inventar uma comparação", () => {
    expect(textoReacao("subiu", null, true)).toBe("Ainda não há coleta anterior para comparar");
    expect(textoReacao("estavel", null, false)).toBe("Sem preço coletado");
  });
});
