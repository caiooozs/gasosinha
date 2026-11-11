"use client";

import { useState } from "react";

/** A altura da folha da lista no celular (D9): fechada (só a pílula), na metade ou em tela cheia. */
export type AlturaFolha = "fechada" | "meia" | "cheia";

/**
 * O estado da folha da lista no celular (D9). Tocar na pílula abre na metade, com o mapa ainda à
 * vista em cima; arrastar leva à tela cheia ou fecha. Fica só na memória da página e não usa o
 * histórico (o botão Voltar do celular não a fecha).
 */
export function useFolhaLista(): {
  altura: AlturaFolha;
  abrir: () => void;
  fechar: () => void;
  definirAltura: (altura: AlturaFolha) => void;
  /** Mostra o mapa de novo sem fechar a lista: da tela cheia, volta para a metade. */
  baixarParaMetade: () => void;
} {
  const [altura, setAltura] = useState<AlturaFolha>("fechada");
  return {
    altura,
    abrir: () => setAltura("meia"),
    fechar: () => setAltura("fechada"),
    definirAltura: setAltura,
    baixarParaMetade: () => setAltura((atual) => (atual === "cheia" ? "meia" : atual)),
  };
}
