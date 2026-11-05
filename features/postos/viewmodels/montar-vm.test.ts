import { describe, expect, it } from "vitest";
import type { PostoNoMapa } from "../domain/tipos";
import { montarGruposLista, montarMarcadores } from "./montar-vm";

const HOJE = "2026-10-27";
const NBSP = " ";
const FONTE = "ANP – Levantamento de Preços de Combustíveis";

const base = { municipio: "RECIFE", lat: -8.06, lng: -34.91 };
const recente: PostoNoMapa = {
  ...base,
  cnpj: "1",
  nome: "RECENTE",
  bandeira: "VIBRA",
  coletaAtual: { data: "2026-10-20", precoMilesimos: 6590, fonte: FONTE },
  coletaAnterior: { data: "2026-10-13", precoMilesimos: 6490 },
};
const antiga: PostoNoMapa = {
  ...base,
  cnpj: "2",
  nome: "ANTIGA",
  bandeira: null,
  coletaAtual: { data: "2026-09-22", precoMilesimos: 5990, fonte: FONTE },
};
const semPreco: PostoNoMapa = { ...base, cnpj: "3", nome: "SEM PRECO", bandeira: "BRANCA" };

describe("montarGruposLista", () => {
  it("monta os grupos com títulos, na ordem do FR-011, e pula grupos vazios", () => {
    expect(montarGruposLista([semPreco, recente], HOJE, "asc").map((g) => g.titulo)).toEqual([
      "Coletas recentes",
      "Sem preço",
    ]);
    expect(montarGruposLista([semPreco, antiga, recente], HOJE, "asc").map((g) => g.titulo)).toEqual([
      "Coletas recentes",
      "Coletas antigas (mais de 4 semanas)",
      "Sem preço",
    ]);
  });

  it("item com preço traz os textos prontos, inclusive a variação", () => {
    const [grupo] = montarGruposLista([recente], HOJE, "asc");
    expect(grupo.itens[0]).toEqual({
      cnpj: "1",
      nome: "RECENTE",
      bandeira: "VIBRA",
      semPreco: false,
      preco: `R$${NBSP}6,59`,
      data: "20/10/2026",
      idade: "há 7 dias",
      antiga: false,
      fonte: FONTE,
      variacao: `+R$${NBSP}0,10 (+1,5%) desde 13/10/2026`,
    });
  });

  it("sem coleta anterior → variação null; bandeira nula → 'bandeira não informada'", () => {
    const [grupo] = montarGruposLista([antiga], HOJE, "asc");
    expect(grupo.itens[0]).toMatchObject({
      bandeira: "bandeira não informada",
      antiga: true,
      idade: "há 5 semanas",
      variacao: null,
    });
  });

  it("item sem preço não tem preço, data, idade nem fonte", () => {
    const [grupo] = montarGruposLista([semPreco], HOJE, "asc");
    expect(grupo.itens[0]).toEqual({
      cnpj: "3",
      nome: "SEM PRECO",
      bandeira: "BRANCA",
      semPreco: true,
      antiga: false,
      variacao: null,
    });
  });
});

describe("montarMarcadores", () => {
  it("separa marcadores e grupos, com rótulo e nome acessível prontos", () => {
    const { marcadores, grupos } = montarMarcadores(
      [
        { tipo: "posto", posto: antiga },
        { tipo: "posto", posto: semPreco },
        { tipo: "grupo", id: 7, lng: -34.9, lat: -8.0, quantidade: 12, zoomExpansao: 13 },
      ],
      HOJE,
    );
    expect(marcadores).toEqual([
      {
        cnpj: "2",
        lng: -34.91,
        lat: -8.06,
        rotulo: `R$${NBSP}5,99 · há 5 sem`,
        nomeAcessivel: `ANTIGA, bandeira não informada, gasolina comum R$${NBSP}5,99, coletado em 22/09/2026`,
        antigo: true,
        semPreco: false,
      },
      {
        cnpj: "3",
        lng: -34.91,
        lat: -8.06,
        rotulo: "sem preço",
        nomeAcessivel: "SEM PRECO, BRANCA, sem preço",
        antigo: false,
        semPreco: true,
      },
    ]);
    expect(grupos).toEqual([{ id: 7, lng: -34.9, lat: -8.0, quantidade: 12, zoomExpansao: 13 }]);
  });
});
