import { describe, expect, test } from "vitest";
import {
  MUNICIPIOS_RMR,
  RMR_LIMITES,
  dentroDaRmr,
  ehMunicipioRmr,
  normalizarNomeMunicipio,
} from "./regiao-rmr.ts";

describe("normalizarNomeMunicipio", () => {
  test("tira acentos, espaços das pontas e passa para maiúsculas", () => {
    expect(normalizarNomeMunicipio("Jaboatão dos Guararapes ")).toBe("JABOATAO DOS GUARARAPES");
  });

  test("junta espaços repetidos", () => {
    expect(normalizarNomeMunicipio("São  Lourenço   da Mata")).toBe("SAO LOURENCO DA MATA");
  });
});

describe("ehMunicipioRmr", () => {
  test("reconhece os municípios da RMR, com ou sem acento", () => {
    expect(ehMunicipioRmr("SAO LOURENCO DA MATA")).toBe(true);
    expect(ehMunicipioRmr("Ilha de Itamaracá")).toBe(true);
  });

  test("recusa municípios de fora", () => {
    expect(ehMunicipioRmr("CARUARU")).toBe(false);
  });
});

describe("MUNICIPIOS_RMR", () => {
  test("tem exatamente 15 municípios, com código IBGE de 7 dígitos", () => {
    expect(MUNICIPIOS_RMR).toHaveLength(15);
    for (const m of MUNICIPIOS_RMR) expect(m.codigoIbge).toMatch(/^26\d{5}$/);
  });

  test("o nome normalizado corresponde ao nome com acento", () => {
    for (const m of MUNICIPIOS_RMR) expect(m.nomeNormalizado).toBe(normalizarNomeMunicipio(m.nome));
  });

  test("RMR_LIMITES contém o retângulo de todos os municípios", () => {
    const [oeste, sul, leste, norte] = RMR_LIMITES;
    for (const { limites } of MUNICIPIOS_RMR) {
      expect(limites[0]).toBeGreaterThanOrEqual(oeste);
      expect(limites[1]).toBeGreaterThanOrEqual(sul);
      expect(limites[2]).toBeLessThanOrEqual(leste);
      expect(limites[3]).toBeLessThanOrEqual(norte);
    }
  });
});

describe("dentroDaRmr", () => {
  test("um posto no Recife está dentro", () => {
    expect(dentroDaRmr(-8.06246, -34.91138)).toBe(true);
  });

  test("um ponto no sertão está fora", () => {
    expect(dentroDaRmr(-9.4, -40.5)).toBe(false);
  });

  test("a margem padrão é de 0,05°", () => {
    const [, , leste] = RMR_LIMITES;
    expect(dentroDaRmr(-8.06, leste + 0.04)).toBe(true);
    expect(dentroDaRmr(-8.06, leste + 0.06)).toBe(false);
  });
});
