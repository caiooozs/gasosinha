import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useFolhaLista } from "./useFolhaLista";

describe("useFolhaLista (D9)", () => {
  it("começa fechada, abre na metade, vai para a tela cheia e fecha", () => {
    const { result } = renderHook(() => useFolhaLista());
    expect(result.current.altura).toBe("fechada");
    act(() => result.current.abrir());
    expect(result.current.altura).toBe("meia");
    act(() => result.current.definirAltura("cheia"));
    expect(result.current.altura).toBe("cheia");
    act(() => result.current.fechar());
    expect(result.current.altura).toBe("fechada");
  });

  it("'baixar para a metade' só vale com a folha em tela cheia", () => {
    const { result } = renderHook(() => useFolhaLista());
    act(() => result.current.baixarParaMetade());
    expect(result.current.altura).toBe("fechada");
    act(() => result.current.definirAltura("cheia"));
    act(() => result.current.baixarParaMetade());
    expect(result.current.altura).toBe("meia");
  });

  it("fica só na memória da página", () => {
    const { result } = renderHook(() => useFolhaLista());
    act(() => result.current.abrir());
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});
