import { describe, expect, it } from "vitest";
import { nomeAcessivelMarcador, partesRotuloMarcador } from "./rotulos";
import type { PostoNoMapa } from "./tipos";

const HOJE = "2026-10-27";
const NBSP = " ";

const iguep: PostoNoMapa = {
  cnpj: "11694577000167",
  nome: "IGUEP INCORPORADORA GUEDES PEREIRA LTDA",
  bandeira: "VIBRA",
  municipio: "RECIFE",
  lat: -8.06246,
  lng: -34.91138,
  coletaAtual: { data: "2026-10-20", precoMilesimos: 6590, fonte: "ANP – Levantamento de Preços de Combustíveis" },
};
const semColeta: PostoNoMapa = { ...iguep, coletaAtual: undefined };

describe("partesRotuloMarcador", () => {
  it("posto com preço → preço e idade curta (\"R$ 6,59 · há 7 d\", FR-007)", () => {
    expect(partesRotuloMarcador(iguep, HOJE)).toEqual({ preco: `R$${NBSP}6,59`, idade: "há 7 d" });
  });

  it("coleta antiga → idade em semanas", () => {
    const antigo = { ...iguep, coletaAtual: { ...iguep.coletaAtual!, data: "2026-09-22" } };
    expect(partesRotuloMarcador(antigo, HOJE)).toEqual({ preco: `R$${NBSP}6,59`, idade: "há 5 sem" });
  });

  it("posto sem coleta → null (o marcador mostra 'sem preço')", () => {
    expect(partesRotuloMarcador(semColeta, HOJE)).toBeNull();
  });
});

describe("nomeAcessivelMarcador", () => {
  it("posto com preço → nome, bandeira, preço e data completa (FR-007)", () => {
    expect(nomeAcessivelMarcador(iguep)).toBe(
      `IGUEP INCORPORADORA GUEDES PEREIRA LTDA, VIBRA, gasolina comum R$${NBSP}6,59, coletado em 20/10/2026`,
    );
  });

  it("mais barato da área → o nome diz isso também (a cor verde não basta)", () => {
    expect(nomeAcessivelMarcador(iguep, { maisBarato: true })).toBe(
      `IGUEP INCORPORADORA GUEDES PEREIRA LTDA, VIBRA, gasolina comum R$${NBSP}6,59, coletado em 20/10/2026, mais barato da área`,
    );
  });

  it("posto sem bandeira → 'bandeira não informada'", () => {
    expect(nomeAcessivelMarcador({ ...iguep, bandeira: null })).toBe(
      `IGUEP INCORPORADORA GUEDES PEREIRA LTDA, bandeira não informada, gasolina comum R$${NBSP}6,59, coletado em 20/10/2026`,
    );
  });

  it("bandeira vazia também conta como não informada", () => {
    expect(nomeAcessivelMarcador({ ...semColeta, bandeira: "  " })).toBe(
      "IGUEP INCORPORADORA GUEDES PEREIRA LTDA, bandeira não informada, sem preço",
    );
  });

  it("posto sem coleta → '…, sem preço'", () => {
    expect(nomeAcessivelMarcador(semColeta)).toBe("IGUEP INCORPORADORA GUEDES PEREIRA LTDA, VIBRA, sem preço");
  });

  it("com a idade curta do marcador, o nome contém o texto visível, logo depois do preço (WCAG 2.5.3, T103)", () => {
    expect(nomeAcessivelMarcador(iguep, { idadeCurta: "há 7 d" })).toBe(
      `IGUEP INCORPORADORA GUEDES PEREIRA LTDA, VIBRA, gasolina comum R$${NBSP}6,59 há 7 d, coletado em 20/10/2026`,
    );
  });
});
