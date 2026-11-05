import { describe, expect, test } from "vitest";
import {
  diasEntre,
  formatarData,
  formatarIdade,
  formatarPercentual,
  formatarPreco,
  formatarVariacao,
  hojeEmSaoPaulo,
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
