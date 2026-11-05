import { describe, expect, test } from "vitest";
import { normalizarCnpj } from "./cnpj.ts";

describe("normalizarCnpj", () => {
  test("tira a máscara e o espaço inicial (formato da série histórica)", () => {
    expect(normalizarCnpj(" 01.492.748/0003-83")).toBe("01492748000383");
  });

  test("completa com zeros o CNPJ que o LPC grava como número (13 dígitos)", () => {
    expect(normalizarCnpj(8220930000162)).toBe("08220930000162");
  });

  test("completa com zeros a string de 12 dígitos (linha real do LPC)", () => {
    expect(normalizarCnpj("672715000352")).toBe("00672715000352");
  });

  test("aceita 14 dígitos válidos", () => {
    expect(normalizarCnpj("11694577000167")).toBe("11694577000167");
  });

  test("rejeita dígitos verificadores inválidos", () => {
    expect(normalizarCnpj("11694577000168")).toBeNull();
    expect(normalizarCnpj(8220930000163)).toBeNull();
  });

  test("rejeita mais de 14 dígitos", () => {
    expect(normalizarCnpj("116945770001670")).toBeNull();
  });

  test("rejeita vazio, só espaços e sequência de zeros", () => {
    expect(normalizarCnpj("")).toBeNull();
    expect(normalizarCnpj("   ")).toBeNull();
    expect(normalizarCnpj("00000000000000")).toBeNull();
  });

  test("rejeita caracteres fora da máscara", () => {
    expect(normalizarCnpj("1169457700016A")).toBeNull();
  });

  test("rejeita número negativo ou com casas decimais", () => {
    expect(normalizarCnpj(-8220930000162)).toBeNull();
    expect(normalizarCnpj(8220930000162.5)).toBeNull();
  });
});
