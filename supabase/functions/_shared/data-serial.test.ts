import { describe, expect, test } from "vitest";
import {
  dataBrParaIso,
  dataEmSaoPaulo,
  dentroDoPeriodo,
  diferencaEmDias,
  inicioDaJanela,
  serialExcelParaIso,
} from "./data-serial.ts";

describe("serialExcelParaIso", () => {
  test("46314 é 19/10/2026 (base 1899-12-30)", () => {
    expect(serialExcelParaIso(46314)).toBe("2026-10-19");
    expect(serialExcelParaIso("46314")).toBe("2026-10-19");
  });

  test("entradas inválidas viram null", () => {
    for (const bruto of [0, -1, 46314.5, "46314.5", "abc", "", Number.NaN]) {
      expect(serialExcelParaIso(bruto)).toBeNull();
    }
  });
});

describe("dataBrParaIso", () => {
  test("'18/10/2026' vira '2026-10-18'", () => {
    expect(dataBrParaIso("18/10/2026")).toBe("2026-10-18");
  });

  test("datas inexistentes ou em outro formato viram null", () => {
    for (const bruto of ["31/02/2026", "2026-10-18", "1/10/2026", "18/13/2026", ""]) {
      expect(dataBrParaIso(bruto)).toBeNull();
    }
  });
});

describe("dentroDoPeriodo", () => {
  const periodo = { inicio: "2026-10-18", fim: "2026-10-24" };

  test("inclui as duas pontas", () => {
    expect(dentroDoPeriodo("2026-10-19", periodo)).toBe(true);
    expect(dentroDoPeriodo("2026-10-18", periodo)).toBe(true);
    expect(dentroDoPeriodo("2026-10-24", periodo)).toBe(true);
  });

  test("fora do período", () => {
    expect(dentroDoPeriodo("2026-10-25", periodo)).toBe(false);
    expect(dentroDoPeriodo("2026-10-17", periodo)).toBe(false);
  });
});

describe("inicioDaJanela", () => {
  test("12 meses antes", () => {
    expect(inicioDaJanela("2026-11-02", 12)).toBe("2025-11-02");
  });

  test("ajusta o dia ao último dia do mês", () => {
    expect(inicioDaJanela("2024-02-29", 12)).toBe("2023-02-28");
    expect(inicioDaJanela("2026-01-31", 2)).toBe("2025-11-30");
  });
});

describe("diferencaEmDias e dataEmSaoPaulo", () => {
  test("conta dias entre datas AAAA-MM-DD", () => {
    expect(diferencaEmDias("2026-10-24", "2026-11-08")).toBe(15);
    expect(diferencaEmDias("2026-10-24", "2026-10-24")).toBe(0);
  });

  test("a data de hoje é a de São Paulo, não a de UTC", () => {
    expect(dataEmSaoPaulo(new Date("2026-10-28T02:30:00Z"))).toBe("2026-10-27");
    expect(dataEmSaoPaulo(new Date("2026-10-28T03:30:00Z"))).toBe("2026-10-28");
  });
});
