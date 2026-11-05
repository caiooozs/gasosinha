import { describe, expect, test } from "vitest";
import { avaliarFonte, transicaoEstado, type EstadoFonte } from "./alerta.ts";

// 08/11/2026 às 12:00 em São Paulo.
const agora = new Date("2026-11-08T15:00:00Z");

describe("avaliarFonte", () => {
  test("precos: mais de 14 dias desde o fim da última edição é atraso", () => {
    const base = { fonte: "precos" as const, ultimaOkEm: "2026-11-08T12:00:00Z", ultimaExecucao: "ok" as const };
    expect(avaliarFonte({ ...base, ultimaEdicaoFim: "2026-10-24" }, agora)).toEqual({ problema: "atraso" });
    expect(avaliarFonte({ ...base, ultimaEdicaoFim: "2026-10-25" }, agora)).toEqual({ problema: null });
  });

  test("precos sem nenhuma edição incorporada é atraso", () => {
    expect(
      avaliarFonte({ fonte: "precos", ultimaOkEm: null, ultimaEdicaoFim: null, ultimaExecucao: null }, agora),
    ).toEqual({ problema: "atraso" });
  });

  test("cadastro: mais de 8 dias sem atualização bem-sucedida é atraso (FR-027)", () => {
    const base = { fonte: "cadastro" as const, ultimaEdicaoFim: null, ultimaExecucao: "ok" as const };
    expect(avaliarFonte({ ...base, ultimaOkEm: "2026-10-31T14:59:00Z" }, agora)).toEqual({ problema: "atraso" });
    expect(avaliarFonte({ ...base, ultimaOkEm: "2026-11-01T09:00:00Z" }, agora)).toEqual({ problema: null });
    expect(avaliarFonte({ ...base, ultimaOkEm: null }, agora)).toEqual({ problema: "atraso" });
  });

  test("a última execução falhou: é falha, mesmo com os dados em dia", () => {
    expect(
      avaliarFonte(
        { fonte: "precos", ultimaOkEm: "2026-11-07T12:00:00Z", ultimaEdicaoFim: "2026-10-31", ultimaExecucao: "falha" },
        agora,
      ),
    ).toEqual({ problema: "falha" });
  });
});

describe("transicaoEstado", () => {
  const ok: EstadoFonte = {
    fonte: "precos",
    ultimaOkEm: "2026-11-07T12:00:00.000Z",
    ultimaEdicaoFim: "2026-10-31",
    emProblema: false,
    tipoProblema: null,
    problemaDesde: null,
  };
  const comProblema: EstadoFonte = {
    ...ok,
    emProblema: true,
    tipoProblema: "falha",
    problemaDesde: "2026-11-06T12:00:00.000Z",
  };

  test("ok → problema: marca o problema, o tipo e o início", () => {
    expect(transicaoEstado(ok, { problema: "falha" }, agora)).toEqual({
      ...ok,
      emProblema: true,
      tipoProblema: "falha",
      problemaDesde: agora.toISOString(),
    });
  });

  test("problema → problema: mantém o início e atualiza o tipo", () => {
    expect(transicaoEstado(comProblema, { problema: "atraso" }, agora)).toEqual({
      ...comProblema,
      tipoProblema: "atraso",
    });
  });

  test("problema → ok: limpa os campos de problema", () => {
    expect(transicaoEstado(comProblema, { problema: null }, agora)).toEqual(ok);
  });

  test("ok → ok: nada muda", () => {
    expect(transicaoEstado(ok, { problema: null }, agora)).toEqual(ok);
  });
});
