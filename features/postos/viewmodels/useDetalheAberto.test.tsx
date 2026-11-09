import { act, render, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { useDetalheAberto, useMarcarDetalheAberto } from "./useDetalheAberto";

function Painel({ ativo }: { ativo: boolean }) {
  useMarcarDetalheAberto(ativo);
  return null;
}

describe("useDetalheAberto (D1)", () => {
  it("sem painel de detalhe montado, o detalhe está fechado", () => {
    expect(renderHook(() => useDetalheAberto()).result.current).toBe(false);
  });

  it("fica aberto enquanto um painel do modo modal está montado e fecha quando ele sai", () => {
    const leitor = renderHook(() => useDetalheAberto());
    const painel = render(createElement(Painel, { ativo: true }));
    expect(leitor.result.current).toBe(true);
    act(() => painel.unmount());
    expect(leitor.result.current).toBe(false);
  });

  it("o painel do modo página não conta como detalhe aberto sobre o mapa", () => {
    const leitor = renderHook(() => useDetalheAberto());
    render(createElement(Painel, { ativo: false }));
    expect(leitor.result.current).toBe(false);
  });

  it("trocar de posto com o detalhe aberto não o fecha no meio do caminho", () => {
    const leitor = renderHook(() => useDetalheAberto());
    const antigo = render(createElement(Painel, { ativo: true }));
    render(createElement(Painel, { ativo: true }));
    act(() => antigo.unmount());
    expect(leitor.result.current).toBe(true);
  });
});
