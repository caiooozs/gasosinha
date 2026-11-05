import { describe, expect, it } from "vitest";
import { agruparPostos } from "./agrupar";
import type { PostoNoMapa } from "./tipos";

const posto = (cnpj: string, lng: number, lat: number): PostoNoMapa => ({
  cnpj,
  nome: cnpj,
  bandeira: null,
  municipio: "RECIFE",
  lat,
  lng,
});

const RMR = [-35.32, -8.66, -34.74, -7.4] as const;
// Três postos a poucos metros um do outro, e um quarto longe.
const proximos = [posto("a", -34.9, -8.06), posto("b", -34.9001, -8.0601), posto("c", -34.9002, -8.0599)];
const longe = posto("d", -35.05, -8.3);

describe("agruparPostos", () => {
  it("em zoom 10, postos sobrepostos viram um grupo com quantidade e zoom de expansão", () => {
    const itens = agruparPostos([...proximos, longe], RMR, 10);
    const grupos = itens.filter((i) => i.tipo === "grupo");
    expect(grupos).toHaveLength(1);
    const [grupo] = grupos;
    if (grupo.tipo !== "grupo") throw new Error("esperava um grupo");
    expect(grupo.quantidade).toBe(3);
    expect(grupo.zoomExpansao).toBeGreaterThan(10);
    expect(grupo.lng).toBeCloseTo(-34.9, 2);
    expect(grupo.lat).toBeCloseTo(-8.06, 2);

    const individuais = itens.filter((i) => i.tipo === "posto");
    expect(individuais.map((i) => (i.tipo === "posto" ? i.posto.cnpj : ""))).toEqual(["d"]);
  });

  it("em zoom 16, todos viram marcadores individuais", () => {
    const itens = agruparPostos([...proximos, longe], RMR, 16);
    expect(itens.every((i) => i.tipo === "posto")).toBe(true);
    expect(itens).toHaveLength(4);
  });

  it("postos sem coordenada não entram", () => {
    const semCoordenada = { ...posto("x", Number.NaN, Number.NaN) };
    const itens = agruparPostos([semCoordenada, longe], RMR, 16);
    expect(itens.map((i) => (i.tipo === "posto" ? i.posto.cnpj : "grupo"))).toEqual(["d"]);
  });

  it("só devolve o que está dentro da área pedida", () => {
    const itens = agruparPostos([...proximos, longe], [-34.95, -8.1, -34.85, -8.0], 16);
    expect(itens.map((i) => (i.tipo === "posto" ? i.posto.cnpj : "grupo")).sort()).toEqual(["a", "b", "c"]);
  });

  it("lista vazia → nada", () => {
    expect(agruparPostos([], RMR, 12)).toEqual([]);
  });
});
