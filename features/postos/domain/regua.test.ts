import { describe, expect, it } from "vitest";
import { acimaDoMenor, calcularRegua } from "./regua";
import type { PostoNoMapa } from "./tipos";

const HOJE = "2026-10-27";
const FONTE = "ANP – Levantamento de Preços de Combustíveis";
const base = { municipio: "RECIFE", lat: -8.06, lng: -34.91, nome: "POSTO", bandeira: null };

function posto(cnpj: string, precoMilesimos?: number, data = "2026-10-20"): PostoNoMapa {
  return precoMilesimos === undefined ? { ...base, cnpj } : { ...base, cnpj, coletaAtual: { data, precoMilesimos, fonte: FONTE } };
}

describe("calcularRegua", () => {
  it("vai do menor ao maior preço entre as coletas recentes, com a diferença em milésimos e em %", () => {
    const regua = calcularRegua([posto("A", 6190), posto("B", 6390), posto("C", 6590)], HOJE);
    expect(regua).toEqual({
      menorMilesimos: 6190,
      maiorMilesimos: 6590,
      diferencaMilesimos: 400,
      // 400 / 6190 = 6,46% → 6,5%
      percentual: 6.5,
      pontos: [
        { cnpj: "A", posicao: 0 },
        { cnpj: "B", posicao: 0.5 },
        { cnpj: "C", posicao: 1 },
      ],
    });
  });

  it("coleta antiga e posto sem preço ficam fora (não concorrem, como no 'mais barato')", () => {
    const regua = calcularRegua([posto("A", 6190), posto("B", 6590), posto("ANTIGA", 5990, "2026-09-01"), posto("SEM")], HOJE);
    expect(regua?.menorMilesimos).toBe(6190);
    expect(regua?.pontos.map((p) => p.cnpj)).toEqual(["A", "B"]);
  });

  it("com menos de duas coletas recentes, ou todas no mesmo preço, não há régua", () => {
    expect(calcularRegua([posto("A", 6190)], HOJE)).toBeNull();
    expect(calcularRegua([posto("A", 6190), posto("B", 6190)], HOJE)).toBeNull();
    expect(calcularRegua([], HOJE)).toBeNull();
  });
});

describe("acimaDoMenor", () => {
  const regua = calcularRegua([posto("A", 6190), posto("B", 6390)], HOJE);

  it("quanto o preço está acima do mais barato da área", () => {
    expect(acimaDoMenor(regua, 6390)).toBe(200);
  });

  it("o próprio mais barato, e qualquer preço sem régua, não têm diferença", () => {
    expect(acimaDoMenor(regua, 6190)).toBeNull();
    expect(acimaDoMenor(null, 6390)).toBeNull();
  });
});
