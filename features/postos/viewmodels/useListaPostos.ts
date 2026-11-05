"use client";

import { useMemo, useState } from "react";
import type { DataISO } from "@/lib/formato";
import type { SentidoPreco } from "../domain/ordenar-lista";
import type { PostoNoMapa } from "../domain/tipos";
import { montarGruposLista } from "./montar-vm";
import type { GrupoListaVM } from "./tipos";
import { useHoje } from "./useHoje";

export type ListaPostosVM = {
  grupos: GrupoListaVM[];
  vazia: boolean;
  sentido: SentidoPreco;
  alternarSentido: () => void;
};

/**
 * Lista da área visível (FR-010 a FR-012): recebe os `postosVisiveis` de `usePostosNaArea` e o
 * "hoje" do servidor. O sentido da ordem de preço fica em estado local.
 */
export function useListaPostos(postos: readonly PostoNoMapa[], hoje: DataISO): ListaPostosVM {
  const hojeAtual = useHoje(hoje);
  const [sentido, setSentido] = useState<SentidoPreco>("asc");
  const grupos = useMemo(() => montarGruposLista(postos, hojeAtual, sentido), [postos, hojeAtual, sentido]);
  return {
    grupos,
    vazia: postos.length === 0,
    sentido,
    alternarSentido: () => setSentido((s) => (s === "asc" ? "desc" : "asc")),
  };
}
