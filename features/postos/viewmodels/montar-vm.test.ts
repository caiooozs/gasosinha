import { describe, expect, it } from "vitest";
import type { PostoNoMapa } from "../domain/tipos";
import { montarGruposLista, montarMarcadores, montarRegua, tituloContagem } from "./montar-vm";

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
const recenteBarato: PostoNoMapa = {
  ...base,
  cnpj: "4",
  nome: "RECENTE BARATO",
  bandeira: "ALE",
  coletaAtual: { data: "2026-10-25", precoMilesimos: 6190, fonte: FONTE },
  coletaAnterior: { data: "2026-10-18", precoMilesimos: 6390 },
};
const antiga: PostoNoMapa = {
  ...base,
  cnpj: "2",
  nome: "ANTIGA",
  bandeira: null,
  coletaAtual: { data: "2026-09-22", precoMilesimos: 5990, fonte: FONTE },
};
const semPreco: PostoNoMapa = { ...base, cnpj: "3", nome: "SEM PRECO", bandeira: "BRANCA" };

describe("tituloContagem", () => {
  it("singular e plural", () => {
    expect(tituloContagem(1)).toBe("1 posto nesta área");
    expect(tituloContagem(8)).toBe("8 postos nesta área");
  });
});

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

  it("item com preço traz os textos prontos, inclusive a variação e a direção dela", () => {
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
      fonteCurta: "ANP",
      // O selo mostra a forma curta, numa linha (D3); o leitor de tela recebe o texto completo.
      variacao: { valor: "+0,10 (+1,5%)", data: "13/10", acessivel: `Variação: +R$${NBSP}0,10 (+1,5%) desde 13/10/2026` },
      direcaoVariacao: "subiu",
      maisBarato: false,
      acimaDoMaisBarato: null,
    });
  });

  it("cada coleta recente mostra quanto está acima do mais barato da área; o mais barato não", () => {
    const [grupo] = montarGruposLista([recente, recenteBarato, antiga], HOJE, "asc");
    expect(grupo.itens.map((i) => [i.nome, i.acimaDoMaisBarato])).toEqual([
      ["RECENTE BARATO", null],
      ["RECENTE", { curto: "+0,40", acessivel: `R$${NBSP}0,40 acima do mais barato da área` }],
    ]);
    // Coleta antiga não concorre: fica sem a diferença.
    const antigas = montarGruposLista([recente, recenteBarato, antiga], HOJE, "asc")[1];
    expect(antigas.itens[0].acimaDoMaisBarato).toBeNull();
  });

  it("marca o mais barato entre as coletas recentes da lista; queda vira direção 'caiu'", () => {
    const [grupo] = montarGruposLista([recente, recenteBarato], HOJE, "asc");
    expect(grupo.itens.map((i) => [i.nome, i.maisBarato, i.direcaoVariacao])).toEqual([
      ["RECENTE BARATO", true, "caiu"],
      ["RECENTE", false, "subiu"],
    ]);
  });

  it("sem coleta anterior → variação e direção null; bandeira nula → 'bandeira não informada'", () => {
    const [grupo] = montarGruposLista([antiga], HOJE, "asc");
    expect(grupo.itens[0]).toMatchObject({
      bandeira: "bandeira não informada",
      antiga: true,
      idade: "há 5 semanas",
      variacao: null,
      direcaoVariacao: null,
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
      direcaoVariacao: null,
      maisBarato: false,
      acimaDoMaisBarato: null,
    });
  });
});

describe("montarRegua", () => {
  it("a régua da área com os textos prontos: diferença, percentual, menor e maior preço", () => {
    expect(montarRegua([recente, recenteBarato, antiga, semPreco], HOJE)).toEqual({
      diferenca: `R$${NBSP}0,40`,
      percentual: "6,5%",
      menor: `R$${NBSP}6,19`,
      maior: `R$${NBSP}6,59`,
      pontos: [
        { cnpj: "1", posicao: 1, maisBarato: false },
        { cnpj: "4", posicao: 0, maisBarato: true },
      ],
      descricao: `Preços das coletas recentes da área: de R$${NBSP}6,19 a R$${NBSP}6,59, diferença de R$${NBSP}0,40 (6,5%).`,
    });
  });

  it("sem duas coletas recentes com preços diferentes, não há régua", () => {
    expect(montarRegua([recente, antiga], HOJE)).toBeNull();
  });
});

describe("montarMarcadores", () => {
  it("separa marcadores e grupos, com preço, idade e nome acessível prontos", () => {
    const { marcadores, grupos } = montarMarcadores(
      [
        { tipo: "posto", posto: antiga },
        { tipo: "posto", posto: semPreco },
        { tipo: "posto", posto: recenteBarato },
        { tipo: "grupo", id: 7, lng: -34.9, lat: -8.0, quantidade: 12, zoomExpansao: 13 },
      ],
      HOJE,
      new Set(["4"]),
    );
    expect(marcadores).toEqual([
      {
        cnpj: "2",
        lng: -34.91,
        lat: -8.06,
        preco: `R$${NBSP}5,99`,
        idade: "há 5 sem",
        nomeAcessivel: `ANTIGA, bandeira não informada, gasolina comum R$${NBSP}5,99, coletado em 22/09/2026`,
        antigo: true,
        semPreco: false,
        maisBarato: false,
      },
      {
        cnpj: "3",
        lng: -34.91,
        lat: -8.06,
        preco: null,
        idade: null,
        nomeAcessivel: "SEM PRECO, BRANCA, sem preço",
        antigo: false,
        semPreco: true,
        maisBarato: false,
      },
      {
        cnpj: "4",
        lng: -34.91,
        lat: -8.06,
        preco: `R$${NBSP}6,19`,
        idade: "há 2 d",
        nomeAcessivel: `RECENTE BARATO, ALE, gasolina comum R$${NBSP}6,19, coletado em 25/10/2026, mais barato da área`,
        antigo: false,
        semPreco: false,
        maisBarato: true,
      },
    ]);
    expect(grupos).toEqual([{ id: 7, lng: -34.9, lat: -8.0, quantidade: 12, zoomExpansao: 13 }]);
  });
});
