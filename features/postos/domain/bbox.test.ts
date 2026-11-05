import { describe, expect, it } from "vitest";
import { filtrarNaAreaVisivel, quantizarBbox } from "./bbox";
import type { PostoNoMapa } from "./tipos";

/** O valor é múltiplo de 0,02 (tolerância só para a representação em ponto flutuante). */
function ehMultiploDe002(v: number): boolean {
  return Math.abs(v * 50 - Math.round(v * 50)) < 1e-9;
}

describe("quantizarBbox", () => {
  it("expande para fora na grade de 0,02°", () => {
    expect(quantizarBbox([-34.915, -8.071, -34.881, -8.049])).toEqual([-34.92, -8.08, -34.88, -8.04]);
  });

  it("um valor que já está na grade não é expandido de novo", () => {
    expect(quantizarBbox([-34.92, -8.08, -34.88, -8.04])).toEqual([-34.92, -8.08, -34.88, -8.04]);
  });

  it("recorta a área nos limites da RMR com margem", () => {
    expect(quantizarBbox([-40, -12, -30, -5])).toEqual([-35.32, -8.66, -34.74, -7.4]);
  });

  it("devolve null para uma área toda fora da RMR", () => {
    expect(quantizarBbox([-36.5, -9.5, -36.0, -9.0])).toBeNull();
  });

  it("a saída é sempre múltipla de 0,02", () => {
    const casos: [number, number, number, number][] = [
      [-34.9512, -8.1234, -34.8711, -8.0013],
      [-35.0001, -8.3333, -34.9999, -8.2222],
      [-34.93, -8.07, -34.91, -8.05],
      [-35.1234567, -7.9876543, -34.8765432, -7.7654321],
    ];
    for (const caso of casos) {
      const q = quantizarBbox(caso);
      expect(q).not.toBeNull();
      for (const v of q!) expect(ehMultiploDe002(v)).toBe(true);
      // e contém a área original
      expect(q![0]).toBeLessThanOrEqual(caso[0]);
      expect(q![1]).toBeLessThanOrEqual(caso[1]);
      expect(q![2]).toBeGreaterThanOrEqual(caso[2]);
      expect(q![3]).toBeGreaterThanOrEqual(caso[3]);
    }
  });
});

describe("filtrarNaAreaVisivel", () => {
  const posto = (cnpj: string, lng: number, lat: number): PostoNoMapa => ({
    cnpj,
    nome: cnpj,
    bandeira: null,
    municipio: "RECIFE",
    lat,
    lng,
  });
  const visivel = [-34.915, -8.071, -34.881, -8.049] as const;

  it("mantém o posto dentro da área visível", () => {
    expect(filtrarNaAreaVisivel([posto("dentro", -34.9, -8.06)], visivel).map((p) => p.cnpj)).toEqual(["dentro"]);
  });

  it("tira o posto que está só na área quantizada, fora da visível", () => {
    // -34.918 está dentro de [-34.92, -34.88], mas fora de [-34.915, -34.881].
    expect(filtrarNaAreaVisivel([posto("margem", -34.918, -8.06)], visivel)).toEqual([]);
  });

  it("mantém o posto exatamente na borda", () => {
    const naBorda = [posto("oeste", -34.915, -8.06), posto("norte", -34.9, -8.049)];
    expect(filtrarNaAreaVisivel(naBorda, visivel).map((p) => p.cnpj)).toEqual(["oeste", "norte"]);
  });
});
