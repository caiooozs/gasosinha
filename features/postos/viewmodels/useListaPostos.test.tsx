import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PostoNoMapa } from "../domain/tipos";
import { useListaPostos } from "./useListaPostos";

const HOJE = "2026-10-27";
const FONTE = "ANP – Levantamento de Preços de Combustíveis";

/** `quantidade` postos com coleta recente, do mais barato para o mais caro. */
function postos(quantidade: number, prefixo = "1"): PostoNoMapa[] {
  return Array.from({ length: quantidade }, (_, i) => ({
    cnpj: `${prefixo}${String(i).padStart(13, "0")}`,
    nome: `POSTO ${prefixo}-${i + 1}`,
    bandeira: "VIBRA",
    municipio: "RECIFE",
    lat: -8.05,
    lng: -34.9,
    coletaAtual: { data: "2026-10-20", precoMilesimos: 6000 + i * 10, fonte: FONTE },
  }));
}

const contar = (grupos: { itens: unknown[] }[]) => grupos.reduce((soma, g) => soma + g.itens.length, 0);

describe("useListaPostos: paginação (D2)", () => {
  it("mostra 20 postos por vez, com o título pelo total e o texto do botão pronto", () => {
    const { result } = renderHook(() => useListaPostos(postos(45), HOJE));
    expect(contar(result.current.grupos)).toBe(20);
    expect(result.current.titulo).toBe("45 postos nesta área");
    expect(result.current.mostrarMais?.texto).toBe("Mostrar mais 20 (faltam 25)");
  });

  it("'Mostrar mais' revela a próxima página, até não faltar nenhum", () => {
    const { result } = renderHook(() => useListaPostos(postos(45), HOJE));
    act(() => result.current.mostrarMais?.onMostrarMais());
    expect(contar(result.current.grupos)).toBe(40);
    expect(result.current.mostrarMais?.texto).toBe("Mostrar os 5 postos restantes");
    act(() => result.current.mostrarMais?.onMostrarMais());
    expect(contar(result.current.grupos)).toBe(45);
    expect(result.current.mostrarMais).toBeNull();
  });

  it("até 20 postos, não há botão", () => {
    const { result } = renderHook(() => useListaPostos(postos(20), HOJE));
    expect(contar(result.current.grupos)).toBe(20);
    expect(result.current.mostrarMais).toBeNull();
  });

  it("mudar a área visível volta para a primeira página", () => {
    const { result, rerender } = renderHook(({ lista }) => useListaPostos(lista, HOJE), { initialProps: { lista: postos(45) } });
    act(() => result.current.mostrarMais?.onMostrarMais());
    expect(contar(result.current.grupos)).toBe(40);
    rerender({ lista: postos(45, "2") });
    expect(contar(result.current.grupos)).toBe(20);
  });

  it("mudar a ordem de preço volta para a primeira página, e o mais barato continua no topo", () => {
    const lista = postos(45);
    const { result } = renderHook(() => useListaPostos(lista, HOJE));
    act(() => result.current.mostrarMais?.onMostrarMais());
    act(() => result.current.definirSentido("desc"));
    expect(contar(result.current.grupos)).toBe(20);
    act(() => result.current.definirSentido("asc"));
    expect(result.current.grupos[0].itens[0].nome).toBe("POSTO 1-1");
  });

  it("a folha do celular e a régua continuam olhando todos os postos da área", () => {
    const { result } = renderHook(() => useListaPostos(postos(45), HOJE));
    expect(result.current.primeiros.map((p) => p.nome)).toEqual(["POSTO 1-1", "POSTO 1-2"]);
    expect(result.current.regua?.pontos).toHaveLength(45);
  });
});
