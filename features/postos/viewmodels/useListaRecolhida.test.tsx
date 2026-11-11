import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useListaRecolhida } from "./useListaRecolhida";

describe("useListaRecolhida (D6)", () => {
  it("a lista começa aberta, recolhe e abre de novo", () => {
    const { result } = renderHook(() => useListaRecolhida());
    expect(result.current.recolhida).toBe(false);
    act(() => result.current.recolher());
    expect(result.current.recolhida).toBe(true);
    act(() => result.current.expandir());
    expect(result.current.recolhida).toBe(false);
  });

  it("o estado fica só na memória da página, sem gravar nada no navegador", () => {
    const { result } = renderHook(() => useListaRecolhida());
    act(() => result.current.recolher());
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});
