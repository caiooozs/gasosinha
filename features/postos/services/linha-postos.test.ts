import { describe, expect, it } from "vitest";
import { linhaParaPosto, type LinhaPostosNaArea } from "./linha-postos";

const FONTE = "ANP – Levantamento de Preços de Combustíveis";

const linha: LinhaPostosNaArea = {
  cnpj: "11694577000167",
  nome: "IGUEP INCORPORADORA GUEDES PEREIRA LTDA",
  bandeira: "VIBRA",
  municipio: "RECIFE",
  lat: -8.06246,
  lng: -34.91138,
  preco_atual: 6.59,
  data_atual: "2026-10-20",
  preco_anterior: 6.49,
  data_anterior: "2026-10-13",
  fonte: FONTE,
};

describe("linhaParaPosto", () => {
  it("converte a linha do RPC, com o preço em milésimos inteiros", () => {
    expect(linhaParaPosto(linha)).toEqual({
      cnpj: "11694577000167",
      nome: "IGUEP INCORPORADORA GUEDES PEREIRA LTDA",
      bandeira: "VIBRA",
      municipio: "RECIFE",
      lat: -8.06246,
      lng: -34.91138,
      coletaAtual: { data: "2026-10-20", precoMilesimos: 6590, fonte: FONTE },
      coletaAnterior: { data: "2026-10-13", precoMilesimos: 6490 },
    });
  });

  it("arredonda o artefato de ponto flutuante (6.599 * 1000 = 6598.999…)", () => {
    expect(linhaParaPosto({ ...linha, preco_atual: 6.599 })?.coletaAtual?.precoMilesimos).toBe(6599);
  });

  it("aceita o numeric como texto", () => {
    expect(linhaParaPosto({ ...linha, preco_atual: "7.190" })?.coletaAtual?.precoMilesimos).toBe(7190);
  });

  it("coleta nula vira undefined (posto sem preço)", () => {
    const semColeta = linhaParaPosto({
      ...linha,
      preco_atual: null,
      data_atual: null,
      preco_anterior: null,
      data_anterior: null,
      fonte: null,
    });
    expect(semColeta?.coletaAtual).toBeUndefined();
    expect(semColeta?.coletaAnterior).toBeUndefined();
  });

  it("só uma coleta → sem coleta anterior", () => {
    const umaColeta = linhaParaPosto({ ...linha, preco_anterior: null, data_anterior: null });
    expect(umaColeta?.coletaAtual).toBeDefined();
    expect(umaColeta?.coletaAnterior).toBeUndefined();
  });

  it("preço sem fonte não é exibido (Princípio I)", () => {
    expect(linhaParaPosto({ ...linha, fonte: null })?.coletaAtual).toBeUndefined();
  });

  it("linha sem coordenada ou sem identificação é descartada", () => {
    expect(linhaParaPosto({ ...linha, lat: null })).toBeNull();
    expect(linhaParaPosto({ ...linha, cnpj: null })).toBeNull();
  });

  it("bandeira nula continua nula (a tela decide o texto)", () => {
    expect(linhaParaPosto({ ...linha, bandeira: null })?.bandeira).toBeNull();
  });
});
