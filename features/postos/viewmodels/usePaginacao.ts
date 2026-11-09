"use client";

import { useState } from "react";

/**
 * Quantos itens estão à vista numa lista paginada com "Mostrar mais" (D2). Começa com `inicial` e
 * cresce `passo` a cada `mostrarMais()`. Volta para o começo quando a `chave` muda (outra área do
 * mapa, outra ordem, outro posto), sem esperar um efeito: o ajuste acontece no próprio render.
 */
export function usePaginacao(chave: string, inicial: number, passo: number): { quantidade: number; mostrarMais: () => void } {
  const [estado, setEstado] = useState({ chave, quantidade: inicial });
  if (estado.chave !== chave) setEstado({ chave, quantidade: inicial });
  const quantidade = estado.chave === chave ? estado.quantidade : inicial;
  const mostrarMais = () => setEstado((atual) => ({ chave: atual.chave, quantidade: atual.quantidade + passo }));
  return { quantidade, mostrarMais };
}
