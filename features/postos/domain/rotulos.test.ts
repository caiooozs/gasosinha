import { describe, expect, it } from "vitest";
import { nomeAcessivelMarcador, rotuloMarcador } from "./rotulos";
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

describe("rotuloMarcador", () => {
  it("posto com preço → preço e idade curta", () => {
    expect(rotuloMarcador(iguep, HOJE)).toBe(`R$${NBSP}6,59 · há 7 d`);
  });

  it("coleta antiga → idade em semanas", () => {
    const antigo = { ...iguep, coletaAtual: { ...iguep.coletaAtual!, data: "2026-09-22" } };
    expect(rotuloMarcador(antigo, HOJE)).toBe(`R$${NBSP}6,59 · há 5 sem`);
  });

  it("posto sem coleta → 'sem preço'", () => {
    expect(rotuloMarcador(semColeta, HOJE)).toBe("sem preço");
  });
});

describe("nomeAcessivelMarcador", () => {
  it("posto com preço → nome, bandeira, preço e data completa (FR-007)", () => {
    expect(nomeAcessivelMarcador(iguep, HOJE)).toBe(
      `IGUEP INCORPORADORA GUEDES PEREIRA LTDA, VIBRA, gasolina comum R$${NBSP}6,59, coletado em 20/10/2026`,
    );
  });

  it("posto sem bandeira → 'bandeira não informada'", () => {
    expect(nomeAcessivelMarcador({ ...iguep, bandeira: null }, HOJE)).toBe(
      `IGUEP INCORPORADORA GUEDES PEREIRA LTDA, bandeira não informada, gasolina comum R$${NBSP}6,59, coletado em 20/10/2026`,
    );
  });

  it("bandeira vazia também conta como não informada", () => {
    expect(nomeAcessivelMarcador({ ...semColeta, bandeira: "  " }, HOJE)).toBe(
      "IGUEP INCORPORADORA GUEDES PEREIRA LTDA, bandeira não informada, sem preço",
    );
  });

  it("posto sem coleta → '…, sem preço'", () => {
    expect(nomeAcessivelMarcador(semColeta, HOJE)).toBe("IGUEP INCORPORADORA GUEDES PEREIRA LTDA, VIBRA, sem preço");
  });
});
