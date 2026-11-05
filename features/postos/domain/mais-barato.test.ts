import { describe, expect, it } from "vitest";
import { cnpjsMaisBaratos } from "./mais-barato";
import type { PostoNoMapa } from "./tipos";

const HOJE = "2026-10-27";
const FONTE = "ANP – Levantamento de Preços de Combustíveis";

function posto(cnpj: string, coleta?: { data: string; preco: number }): PostoNoMapa {
  return {
    cnpj,
    nome: cnpj,
    bandeira: null,
    municipio: "RECIFE",
    lat: -8.06,
    lng: -34.91,
    coletaAtual: coleta ? { data: coleta.data, precoMilesimos: coleta.preco, fonte: FONTE } : undefined,
  };
}

describe("cnpjsMaisBaratos", () => {
  it("marca o menor preço entre as coletas recentes da área", () => {
    const postos = [
      posto("a", { data: "2026-10-20", preco: 6590 }),
      posto("b", { data: "2026-10-25", preco: 6190 }),
      posto("c", { data: "2026-10-24", preco: 6390 }),
    ];
    expect([...cnpjsMaisBaratos(postos, HOJE)]).toEqual(["b"]);
  });

  it("empate: todos com o menor preço são marcados", () => {
    const postos = [
      posto("a", { data: "2026-10-20", preco: 6190 }),
      posto("b", { data: "2026-10-25", preco: 6190 }),
      posto("c", { data: "2026-10-25", preco: 6390 }),
    ];
    expect([...cnpjsMaisBaratos(postos, HOJE)].sort()).toEqual(["a", "b"]);
  });

  it("coleta antiga não concorre, mesmo mais barata (FR-011)", () => {
    const postos = [
      posto("antiga", { data: "2026-09-22", preco: 5990 }),
      posto("a", { data: "2026-10-20", preco: 6590 }),
      posto("b", { data: "2026-10-25", preco: 6390 }),
    ];
    expect([...cnpjsMaisBaratos(postos, HOJE)]).toEqual(["b"]);
  });

  it("menos de duas coletas recentes → ninguém é marcado (não há com quem comparar)", () => {
    expect(cnpjsMaisBaratos([posto("a", { data: "2026-10-20", preco: 6590 }), posto("b")], HOJE).size).toBe(0);
    expect(cnpjsMaisBaratos([], HOJE).size).toBe(0);
  });

  it("todos com o mesmo preço → ninguém é marcado", () => {
    const postos = [posto("a", { data: "2026-10-20", preco: 6590 }), posto("b", { data: "2026-10-25", preco: 6590 })];
    expect(cnpjsMaisBaratos(postos, HOJE).size).toBe(0);
  });
});
