import { renderHook } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { useTelaCelular } from "./useTelaCelular";

const original = window.matchMedia;
afterEach(() => {
  window.matchMedia = original;
});

describe("useTelaCelular (D9)", () => {
  it("segue a largura da tela: abaixo de 768 px é celular", () => {
    window.matchMedia = (consulta: string) => ({ ...original(consulta), matches: consulta === "(max-width: 767px)" });
    expect(renderHook(() => useTelaCelular()).result.current).toBe(true);
    window.matchMedia = (consulta: string) => ({ ...original(consulta), matches: false });
    expect(renderHook(() => useTelaCelular()).result.current).toBe(false);
  });

  it("no servidor, que não sabe a largura, não é celular", () => {
    function Sonda() {
      return createElement("span", null, useTelaCelular() ? "celular" : "computador");
    }
    expect(renderToString(createElement(Sonda))).toContain("computador");
  });
});
