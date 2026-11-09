import { describe, expect, test } from "vitest";
import {
  diasEntre,
  formatarData,
  formatarIdade,
  formatarDataCurta,
  formatarDiferencaCurta,
  formatarPercentual,
  formatarPercentualSemSinal,
  formatarPreco,
  formatarVariacao,
  formatarVariacaoCurta,
  hojeEmSaoPaulo,
  separarMoeda,
} from "./index";

// O Intl usa o espaço não separável (U+00A0) entre "R$" e o valor.
const R$ = "R$ ";
const MENOS = "−";

describe("moeda", () => {
  test("2 casas quando a terceira é zero", () => {
    expect(formatarPreco(6590)).toBe(`${R$}6,59`);
    expect(formatarPreco(7000)).toBe(`${R$}7,00`);
  });

  test("3 casas quando a fonte trouxe 3", () => {
    expect(formatarPreco(6599)).toBe(`${R$}6,599`);
  });
});

describe("data", () => {
  test("AAAA-MM-DD vira dd/mm/aaaa, sem passar por new Date", () => {
    const DateOriginal = globalThis.Date;
    globalThis.Date = function () {
      throw new Error("formatarData não pode usar new Date");
    } as unknown as DateConstructor;
    try {
      expect(formatarData("2026-10-20")).toBe("20/10/2026");
    } finally {
      globalThis.Date = DateOriginal;
    }
  });

  test("hoje é a data de São Paulo, não a de UTC", () => {
    expect(hojeEmSaoPaulo(new Date("2026-10-28T02:30:00Z"))).toBe("2026-10-27");
  });

  test("dias entre duas datas", () => {
    expect(diasEntre("2026-09-22", "2026-10-27")).toBe(35);
  });
});

describe("idade", () => {
  test("dias, nas formas longa e curta", () => {
    expect(formatarIdade({ unidade: "dias", valor: 7 }, false)).toBe("há 7 dias");
    expect(formatarIdade({ unidade: "dias", valor: 7 }, true)).toBe("há 7 d");
    expect(formatarIdade({ unidade: "dias", valor: 1 }, false)).toBe("há 1 dia");
  });

  test("semanas", () => {
    expect(formatarIdade({ unidade: "semanas", valor: 5 }, false)).toBe("há 5 semanas");
    expect(formatarIdade({ unidade: "semanas", valor: 5 }, true)).toBe("há 5 sem");
  });

  test("meses, igual nas duas formas", () => {
    expect(formatarIdade({ unidade: "meses", valor: 4 }, false)).toBe("há 4 meses");
    expect(formatarIdade({ unidade: "meses", valor: 4 }, true)).toBe("há 4 meses");
  });

  test("coleta de hoje", () => {
    expect(formatarIdade({ unidade: "dias", valor: 0 }, false)).toBe("hoje");
    expect(formatarIdade({ unidade: "dias", valor: 0 }, true)).toBe("hoje");
  });
});

describe("percentual", () => {
  test("com sinal e uma casa decimal", () => {
    expect(formatarPercentual(1.5)).toBe("+1,5%");
    expect(formatarPercentual(-3)).toBe(`${MENOS}3,0%`);
    expect(formatarPercentual(0)).toBe("0,0%");
  });
});

describe("variação", () => {
  test("alta", () => {
    expect(formatarVariacao({ diferencaMilesimos: 100, percentual: 1.5, desde: "2026-10-13" })).toBe(
      `+${R$}0,10 (+1,5%) desde 13/10/2026`,
    );
  });

  test("queda, com o sinal de menos U+2212", () => {
    expect(formatarVariacao({ diferencaMilesimos: -200, percentual: -3.0, desde: "2026-10-13" })).toBe(
      `${MENOS}${R$}0,20 (${MENOS}3,0%) desde 13/10/2026`,
    );
  });

  test("sem mudança", () => {
    expect(formatarVariacao({ diferencaMilesimos: 0, percentual: 0, desde: "2026-10-13" })).toBe(
      `${R$}0,00 (0,0%) desde 13/10/2026`,
    );
  });
});

describe("partes da moeda", () => {
  test("separa o símbolo do valor, para o valor aparecer maior que o 'R$'", () => {
    expect(separarMoeda(formatarPreco(6590))).toEqual({ simbolo: "R$", valor: "6,59" });
    expect(separarMoeda(formatarPreco(6599))).toEqual({ simbolo: "R$", valor: "6,599" });
  });

  test("texto sem o símbolo volta inteiro no valor", () => {
    expect(separarMoeda("6,59")).toEqual({ simbolo: null, valor: "6,59" });
  });
});

describe("data curta", () => {
  test("AAAA-MM-DD vira dd/mm, para eixos de gráfico", () => {
    expect(formatarDataCurta("2026-09-15")).toBe("15/09");
  });
});

describe("diferença curta", () => {
  test("com sinal e sem o símbolo da moeda; 3 casas só quando o valor tem 3", () => {
    expect(formatarDiferencaCurta(200)).toBe("+0,20");
    expect(formatarDiferencaCurta(-60)).toBe(`${MENOS}0,06`);
    expect(formatarDiferencaCurta(0)).toBe("0,00");
    expect(formatarDiferencaCurta(15)).toBe("+0,015");
  });
});

describe("percentual sem sinal", () => {
  test("uma casa decimal, para distâncias que não têm direção", () => {
    expect(formatarPercentualSemSinal(6.5)).toBe("6,5%");
    expect(formatarPercentualSemSinal(-3)).toBe("3,0%");
  });
});

describe("formatarVariacaoCurta (selo da lista, D3)", () => {
  const ATUAL = "2026-10-29";

  // Valor e data vêm separados: o selo escreve "desde" entre eles e o esconde em telas estreitas.
  test("sem 'R$', que já está no preço da linha, e com a data curta da coleta anterior", () => {
    expect(formatarVariacaoCurta({ diferencaMilesimos: -100, percentual: -1.5, desde: "2026-10-22" }, ATUAL)).toEqual({
      valor: `${MENOS}0,10 (${MENOS}1,5%)`,
      data: "22/10",
    });
  });

  test("3 casas só quando o valor tem 3, como no preço", () => {
    expect(formatarVariacaoCurta({ diferencaMilesimos: 15, percentual: 0.2, desde: "2026-10-22" }, ATUAL).valor).toBe("+0,015 (+0,2%)");
  });

  test("mesmo preço", () => {
    expect(formatarVariacaoCurta({ diferencaMilesimos: 0, percentual: 0, desde: "2026-10-22" }, ATUAL).valor).toBe("0,00 (0,0%)");
  });

  test("coleta anterior de outro ano que a mais recente: a data leva o ano com 2 dígitos", () => {
    expect(formatarVariacaoCurta({ diferencaMilesimos: 100, percentual: 1.5, desde: "2025-12-22" }, "2026-01-05").data).toBe("22/12/25");
  });
});
