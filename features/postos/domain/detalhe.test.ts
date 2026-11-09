import { describe, expect, it } from "vitest";
import { montarDetalheVM, montarMetadadosPosto, type DetalhePostoDados } from "./detalhe";

const HOJE = "2026-10-27";
const NBSP = " ";
const FONTE = "ANP – Levantamento de Preços de Combustíveis";

const base: Omit<DetalhePostoDados, "coletas"> = {
  cnpj: "11694577000167",
  nome: "IGUEP INCORPORADORA GUEDES PEREIRA LTDA",
  bandeira: "VIBRA",
  endereco: "AVENIDA ENG ABDIAS DE CARVALHO, 1142",
  bairro: "PRADO",
  municipio: "RECIFE",
  lat: -8.06246,
  lng: -34.91138,
  ativo: true,
};
const coleta = (data: string, precoMilesimos: number) => ({ data, precoMilesimos, fonte: FONTE });

const variasColetas: DetalhePostoDados = {
  ...base,
  coletas: [coleta("2026-09-22", 6590), coleta("2026-09-15", 6490), coleta("2026-09-08", 6490)],
};
const umaColeta: DetalhePostoDados = { ...base, coletas: [coleta("2026-10-20", 6590)] };
const nenhumaColeta: DetalhePostoDados = { ...base, coletas: [] };

describe("montarDetalheVM", () => {
  it("várias coletas: preço, data, idade, fonte, histórico (mais recente primeiro) e variação", () => {
    // O gráfico e a grade de variações têm testes próprios abaixo.
    const { grafico, variacoesColetas, ...vm } = montarDetalheVM(variasColetas, HOJE);
    expect(grafico).not.toBeNull();
    expect(variacoesColetas).toHaveLength(2);
    expect(vm).toEqual({
      cnpj: "11694577000167",
      nome: "IGUEP INCORPORADORA GUEDES PEREIRA LTDA",
      bandeira: "VIBRA",
      endereco: "AVENIDA ENG ABDIAS DE CARVALHO, 1142 · PRADO · Recife",
      semPreco: false,
      precoAtual: `R$${NBSP}6,59`,
      dataAtual: "22/09/2026",
      idadeTexto: "coletado há 5 semanas",
      idadeAntiga: true,
      fonte: FONTE,
      variacaoPercentual: "+1,5%",
      direcaoVariacao: "subiu",
      reacao: "subiu",
      textoReacao: `Subiu R$${NBSP}0,10 (+1,5%) desde 15/09/2026`,
      historico: [
        { data: "22/09/2026", preco: `R$${NBSP}6,59` },
        { data: "15/09/2026", preco: `R$${NBSP}6,49` },
        { data: "08/09/2026", preco: `R$${NBSP}6,49` },
      ],
      avisoInativo: null,
    });
  });

  it("o gráfico do histórico vem com as datas das pontas, as marcas do eixo e a descrição para leitores de tela", () => {
    const { grafico } = montarDetalheVM(variasColetas, HOJE);
    expect(grafico).toMatchObject({ inicio: "08/09", fim: "22/09" });
    expect(grafico?.pontos).toHaveLength(3);
    expect(grafico?.rotulosY.map((r) => r.texto)).toEqual(["6,50", "6,55", "6,60"]);
    expect(grafico?.referenciaY).toBe(grafico?.pontos[1].y);
    expect(grafico?.descricao).toBe(
      `Preço por coleta: 08/09, R$${NBSP}6,49; 15/09, R$${NBSP}6,49; 22/09, R$${NBSP}6,59. A linha tracejada marca a coleta anterior.`,
    );
  });

  it("a grade de variações mostra a diferença de cada coleta para a anterior, com a direção", () => {
    expect(montarDetalheVM(variasColetas, HOJE).variacoesColetas).toEqual([
      { data: "15/09", texto: "0,00", direcao: "igual" },
      { data: "22/09", texto: "+0,10", direcao: "subiu" },
    ]);
  });

  it("uma coleta: sem variação, nem zero, o Gasosinha neutro e o texto de que não há anterior (FR-016, FR-018)", () => {
    const vm = montarDetalheVM(umaColeta, HOJE);
    expect(vm.variacaoPercentual).toBeNull();
    expect(vm.grafico).toBeNull();
    expect(vm.variacoesColetas).toEqual([]);
    expect(vm.direcaoVariacao).toBeNull();
    expect(vm.reacao).toBe("neutro");
    expect(vm.textoReacao).toBe("Ainda não há coleta anterior para comparar");
    expect(vm.idadeTexto).toBe("coletado há 7 dias");
    expect(vm.idadeAntiga).toBe(false);
    expect(vm.historico).toHaveLength(1);
  });

  it("nenhuma coleta: 'sem preço', sem histórico, sem variação e o Gasosinha neutro (FR-016, FR-018)", () => {
    expect(montarDetalheVM(nenhumaColeta, HOJE)).toMatchObject({
      semPreco: true,
      precoAtual: null,
      dataAtual: null,
      idadeTexto: null,
      idadeAntiga: false,
      fonte: null,
      variacaoPercentual: null,
      direcaoVariacao: null,
      reacao: "neutro",
      textoReacao: "Sem preço coletado",
      historico: [],
    });
  });

  it("posto inativo: aviso de que não consta mais como autorizado", () => {
    expect(montarDetalheVM({ ...umaColeta, ativo: false }, HOJE).avisoInativo).toBe(
      "Este posto não consta mais como autorizado pela ANP.",
    );
  });

  it("bandeira nula → 'bandeira não informada'; sem bairro, o endereço não tem o separador a mais", () => {
    const vm = montarDetalheVM({ ...umaColeta, bandeira: null, bairro: null }, HOJE);
    expect(vm.bandeira).toBe("bandeira não informada");
    expect(vm.endereco).toBe("AVENIDA ENG ABDIAS DE CARVALHO, 1142 · Recife");
  });

  it("coleta de hoje → 'coletado hoje'", () => {
    expect(montarDetalheVM({ ...base, coletas: [coleta(HOJE, 6590)] }, HOJE).idadeTexto).toBe("coletado hoje");
  });

  it("queda de preço → direção e reação 'caiu', com a queda em R$ e em % (FR-015, FR-019)", () => {
    const vm = montarDetalheVM({ ...base, coletas: [coleta("2026-10-20", 6390), coleta("2026-10-13", 6590)] }, HOJE);
    expect(vm.direcaoVariacao).toBe("caiu");
    expect(vm.reacao).toBe("caiu");
    expect(vm.textoReacao).toBe(`Caiu R$${NBSP}0,20 (−3,0%) desde 13/10/2026`);
  });

  it("mesmo preço da coleta anterior → direção 'igual' e reação 'estável', com a data dela", () => {
    const vm = montarDetalheVM({ ...base, coletas: [coleta("2026-10-20", 6490), coleta("2026-10-13", 6490)] }, HOJE);
    expect(vm.direcaoVariacao).toBe("igual");
    expect(vm.variacaoPercentual).toBe("0,0%");
    expect(vm.reacao).toBe("estavel");
    expect(vm.textoReacao).toBe("Mesmo preço da coleta de 13/10/2026");
  });
});

describe("montarMetadadosPosto", () => {
  it("com preço → título com o nome e descrição com preço, data e fonte (Princípio I)", () => {
    expect(montarMetadadosPosto(umaColeta)).toEqual({
      titulo: "IGUEP INCORPORADORA GUEDES PEREIRA LTDA — Gasosinha",
      descricao: `Gasolina comum R$${NBSP}6,59, coletado em 20/10/2026 (ANP)`,
    });
  });

  it("sem coleta → 'Gasolina comum: sem preço'", () => {
    expect(montarMetadadosPosto(nenhumaColeta).descricao).toBe("Gasolina comum: sem preço");
  });
});
