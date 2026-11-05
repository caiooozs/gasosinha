import { describe, expect, it } from "vitest";
import { ordenarLista } from "./ordenar-lista";
import type { PostoNoMapa } from "./tipos";

const HOJE = "2026-10-27";
const FONTE = "ANP – Levantamento de Preços de Combustíveis";

function posto(cnpj: string, nome: string, coleta?: { data: string; preco: number }): PostoNoMapa {
  return {
    cnpj,
    nome,
    bandeira: null,
    municipio: "RECIFE",
    lat: -8.06,
    lng: -34.91,
    coletaAtual: coleta ? { data: coleta.data, precoMilesimos: coleta.preco, fonte: FONTE } : undefined,
  };
}

const recenteCaro = posto("1", "POSTO C", { data: "2026-10-20", preco: 6790 });
const recenteBarato = posto("2", "POSTO B", { data: "2026-10-13", preco: 6390 });
const recenteEmpateZ = posto("3", "POSTO Z", { data: "2026-10-20", preco: 6590 });
const recenteEmpateA = posto("4", "POSTO A", { data: "2026-10-20", preco: 6590 });
const antigaMaisBarata = posto("5", "POSTO ANTIGO BARATO", { data: "2026-09-22", preco: 5990 });
const antigaCara = posto("6", "POSTO ANTIGO CARO", { data: "2026-09-01", preco: 6990 });
const semPrecoB = posto("7", "SEM PRECO B");
const semPrecoA = posto("8", "SEM PRECO A");

const todos = [semPrecoB, antigaCara, recenteCaro, semPrecoA, antigaMaisBarata, recenteEmpateZ, recenteBarato, recenteEmpateA];

describe("ordenarLista", () => {
  it("agrupa em recentes, antigas e sem preço, nesta ordem (FR-011)", () => {
    const grupos = ordenarLista(todos, HOJE, "asc").map((p) => p.grupo);
    expect(grupos).toEqual(["recente", "recente", "recente", "recente", "antiga", "antiga", "sem_preco", "sem_preco"]);
  });

  it("ordena por preço crescente dentro de cada grupo e desempata pelo nome", () => {
    const nomes = ordenarLista(todos, HOJE, "asc").map((p) => p.nome);
    expect(nomes).toEqual([
      "POSTO B",
      "POSTO A",
      "POSTO Z",
      "POSTO C",
      "POSTO ANTIGO BARATO",
      "POSTO ANTIGO CARO",
      "SEM PRECO A",
      "SEM PRECO B",
    ]);
  });

  it("um posto antigo mais barato fica depois de todos os recentes", () => {
    const ordem = ordenarLista(todos, HOJE, "asc").map((p) => p.cnpj);
    const posAntigo = ordem.indexOf(antigaMaisBarata.cnpj);
    for (const recente of [recenteCaro, recenteBarato, recenteEmpateA, recenteEmpateZ]) {
      expect(ordem.indexOf(recente.cnpj)).toBeLessThan(posAntigo);
    }
  });

  it("inverter o sentido inverte o preço dentro dos grupos, mas não a ordem dos grupos", () => {
    const resultado = ordenarLista(todos, HOJE, "desc");
    expect(resultado.map((p) => p.grupo)).toEqual([
      "recente",
      "recente",
      "recente",
      "recente",
      "antiga",
      "antiga",
      "sem_preco",
      "sem_preco",
    ]);
    expect(resultado.map((p) => p.nome)).toEqual([
      "POSTO C",
      "POSTO A",
      "POSTO Z",
      "POSTO B",
      "POSTO ANTIGO CARO",
      "POSTO ANTIGO BARATO",
      "SEM PRECO A",
      "SEM PRECO B",
    ]);
  });

  it("compara o preço em milésimos (inteiro), não em reais", () => {
    const a = posto("10", "A", { data: "2026-10-20", preco: 6599 });
    const b = posto("11", "B", { data: "2026-10-20", preco: 6590 });
    expect(ordenarLista([a, b], HOJE, "asc").map((p) => p.cnpj)).toEqual(["11", "10"]);
  });

  it("cada item informa o grupo e mantém os dados do posto", () => {
    const [primeiro] = ordenarLista([recenteBarato], HOJE, "asc");
    expect(primeiro).toEqual({ ...recenteBarato, grupo: "recente" });
  });

  it("não altera a lista recebida", () => {
    const copia = [...todos];
    ordenarLista(todos, HOJE, "asc");
    expect(todos).toEqual(copia);
  });
});
