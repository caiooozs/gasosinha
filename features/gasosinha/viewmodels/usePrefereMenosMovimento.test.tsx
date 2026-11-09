import { renderHook } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePrefereMenosMovimento } from "./usePrefereMenosMovimento";

const CONSULTA = "(prefers-reduced-motion: reduce)";
const original = window.matchMedia;

function simularPreferencia(reduzir: boolean) {
  window.matchMedia = vi.fn((consulta: string) => ({
    ...original(consulta),
    matches: consulta === CONSULTA && reduzir,
  }));
}

afterEach(() => {
  window.matchMedia = original;
});

describe("usePrefereMenosMovimento", () => {
  it("segue a preferência do sistema por menos movimento", () => {
    simularPreferencia(true);
    expect(renderHook(() => usePrefereMenosMovimento()).result.current).toBe(true);
    simularPreferencia(false);
    expect(renderHook(() => usePrefereMenosMovimento()).result.current).toBe(false);
  });

  it("no servidor, que não sabe a preferência, fica parado por padrão", () => {
    function Sonda() {
      return createElement("span", null, usePrefereMenosMovimento() ? "parado" : "animado");
    }
    expect(renderToString(createElement(Sonda))).toContain("parado");
  });
});
