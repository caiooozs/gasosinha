import { describe, expect, it } from "vitest";
import { agruparPostos } from "./agrupar";
import { planejarFoco } from "./foco";
import type { PostoNoMapa } from "./tipos";

const posto = (cnpj: string, lng: number, lat: number): PostoNoMapa => ({
  cnpj,
  nome: `POSTO ${cnpj}`,
  bandeira: null,
  municipio: "RECIFE",
  lat,
  lng,
});

// Dois postos a uns 30 m um do outro: no zoom 12 eles viram um grupo.
const vizinhoA = posto("11111111000111", -34.9, -8.05);
const vizinhoB = posto("22222222000122", -34.9003, -8.05);
const isolado = posto("33333333000133", -35.1, -7.8);
const BBOX_RMR = [-35.3, -8.7, -34.7, -7.4] as const;

describe("planejarFoco (D5)", () => {
  it("posto já visível sozinho no zoom atual: centraliza nele e mantém o zoom", () => {
    expect(planejarFoco([vizinhoA, vizinhoB, isolado], isolado.cnpj, 12.4)).toEqual({ lng: -35.1, lat: -7.8, zoom: 12.4 });
  });

  it("posto dentro de um grupo: aproxima só até ele aparecer sozinho", () => {
    const plano = planejarFoco([vizinhoA, vizinhoB, isolado], vizinhoA.cnpj, 12);
    expect(plano).not.toBeNull();
    expect(plano!.zoom).toBeGreaterThan(12);
    expect(plano!.zoom).toBeLessThanOrEqual(16);
    const noZoomPlanejado = agruparPostos([vizinhoA, vizinhoB, isolado], BBOX_RMR, plano!.zoom);
    expect(noZoomPlanejado.some((item) => item.tipo === "posto" && item.posto.cnpj === vizinhoA.cnpj)).toBe(true);
    // Um nível antes, ele ainda estava no grupo: o zoom planejado é o menor que basta.
    const umNivelAntes = agruparPostos([vizinhoA, vizinhoB, isolado], BBOX_RMR, plano!.zoom - 1);
    expect(umNivelAntes.some((item) => item.tipo === "posto" && item.posto.cnpj === vizinhoA.cnpj)).toBe(false);
  });

  it("zoom já mais perto que o necessário: mantém o zoom de quem está olhando", () => {
    expect(planejarFoco([vizinhoA, vizinhoB], vizinhoA.cnpj, 17)?.zoom).toBe(17);
  });

  it("posto que não está na área ou sem coordenada válida: não há o que focar", () => {
    expect(planejarFoco([vizinhoA], "99999999000199", 12)).toBeNull();
    expect(planejarFoco([posto("44444444000144", Number.NaN, -8.05)], "44444444000144", 12)).toBeNull();
  });
});
