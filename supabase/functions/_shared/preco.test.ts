import { afterEach, describe, expect, test, vi } from "vitest";
import { canonicalizarPreco } from "./preco.ts";

const rejeitado = { ok: false, motivo: "preco_invalido" };

describe("canonicalizarPreco", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("'7.19' vira 7190 milésimos", () => {
    expect(canonicalizarPreco("7.19")).toEqual({ ok: true, valor: "7.190", milesimos: 7190 });
  });

  test("'6.5' vira 6500 milésimos", () => {
    expect(canonicalizarPreco("6.5")).toEqual({ ok: true, valor: "6.500", milesimos: 6500 });
  });

  test("'6.4899999999999993' vira 6490, porque a diferença é menor que 1e-9", () => {
    expect(canonicalizarPreco("6.4899999999999993")).toEqual({ ok: true, valor: "6.490", milesimos: 6490 });
  });

  test("aceita os artefatos reais do arquivo do LPC", () => {
    expect(canonicalizarPreco("8.9700000000000006")).toMatchObject({ ok: true, milesimos: 8970 });
    expect(canonicalizarPreco("4.4000000000000004")).toMatchObject({ ok: true, milesimos: 4400 });
  });

  test("'6.4891' é rejeitado, porque não é artefato de float", () => {
    expect(canonicalizarPreco("6.4891")).toEqual(rejeitado);
  });

  test("o limite de 1e-9 é aplicado com aritmética decimal exata", () => {
    expect(canonicalizarPreco("6.4890000009")).toMatchObject({ ok: true, milesimos: 6489 });
    expect(canonicalizarPreco("6.489000002")).toEqual(rejeitado);
  });

  test("rejeita 50 ou mais e aceita logo abaixo", () => {
    expect(canonicalizarPreco("100")).toEqual(rejeitado);
    expect(canonicalizarPreco("50")).toEqual(rejeitado);
    expect(canonicalizarPreco("49.999")).toMatchObject({ ok: true, milesimos: 49999 });
  });

  test("rejeita zero", () => {
    expect(canonicalizarPreco("0")).toEqual(rejeitado);
    expect(canonicalizarPreco("0.000")).toEqual(rejeitado);
  });

  test("rejeita texto, vazio, negativo, vírgula e notação científica", () => {
    for (const bruto of ["abc", "", "-6.49", "6,49", "6.49e0", "6."]) {
      expect(canonicalizarPreco(bruto)).toEqual(rejeitado);
    }
  });

  test("aceita espaços nas pontas e número", () => {
    expect(canonicalizarPreco(" 6.59 ")).toMatchObject({ ok: true, milesimos: 6590 });
    expect(canonicalizarPreco(6.59)).toMatchObject({ ok: true, milesimos: 6590 });
  });

  test("não usa parseFloat para decidir o arredondamento", () => {
    const parseFloatDoNumber = vi.spyOn(Number, "parseFloat");
    const parseFloatGlobal = vi.spyOn(globalThis, "parseFloat");
    canonicalizarPreco("6.4899999999999993");
    canonicalizarPreco("7.19");
    expect(parseFloatDoNumber).not.toHaveBeenCalled();
    expect(parseFloatGlobal).not.toHaveBeenCalled();
  });
});
