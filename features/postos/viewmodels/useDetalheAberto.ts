"use client";

import { useEffect, useSyncExternalStore } from "react";

// Quantos painéis de detalhe do modo modal estão montados. Ao trocar de posto, o novo painel monta
// antes de o antigo sair, então a contagem nunca passa por zero no meio da troca.
let abertos = 0;
const ouvintes = new Set<() => void>();

function avisar() {
  for (const ouvinte of ouvintes) ouvinte();
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

/**
 * Chamado pelo `PainelDetalhe`: marca que o detalhe está aberto sobre o mapa enquanto o painel do
 * modo modal estiver montado. O modo página não conta, porque ali o detalhe é a própria página.
 */
export function useMarcarDetalheAberto(ativo: boolean): void {
  useEffect(() => {
    if (!ativo) return;
    abertos += 1;
    avisar();
    return () => {
      abertos -= 1;
      avisar();
    };
  }, [ativo]);
}

/**
 * Se o detalhe de um posto está aberto sobre o mapa (D1). Com ele aberto, abrir outro posto pelo
 * mapa ou pela lista troca o detalhe sem empilhar o histórico, para que "Fechar" volte ao mapa num
 * passo só.
 */
export function useDetalheAberto(): boolean {
  return useSyncExternalStore(
    assinar,
    () => abertos > 0,
    () => false,
  );
}
