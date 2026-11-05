"use client";

import { useMemo, useState } from "react";
import type { DataISO } from "@/lib/formato";
import type { SentidoPreco } from "../domain/ordenar-lista";
import type { PostoNoMapa } from "../domain/tipos";
import { montarGruposLista, tituloContagem } from "./montar-vm";
import type { GrupoListaVM, ItemListaVM } from "./tipos";
import { useHoje } from "./useHoje";

const QUANTOS_NA_FOLHA = 2;

export type ListaPostosVM = {
  grupos: GrupoListaVM[];
  /** As primeiras linhas, na ordem escolhida: a folha do mapa no celular mostra estas. */
  primeiros: ItemListaVM[];
  vazia: boolean;
  /** "8 postos nesta área". */
  titulo: string;
  sentido: SentidoPreco;
  definirSentido: (sentido: SentidoPreco) => void;
};

/**
 * Lista da área visível (FR-010 a FR-012): recebe os `postosVisiveis` de `usePostosNaArea` e o
 * "hoje" do servidor. O sentido da ordem de preço fica em estado local.
 */
export function useListaPostos(postos: readonly PostoNoMapa[], hoje: DataISO): ListaPostosVM {
  const hojeAtual = useHoje(hoje);
  const [sentido, definirSentido] = useState<SentidoPreco>("asc");
  const grupos = useMemo(() => montarGruposLista(postos, hojeAtual, sentido), [postos, hojeAtual, sentido]);
  const primeiros = useMemo(() => grupos.flatMap((g) => g.itens).slice(0, QUANTOS_NA_FOLHA), [grupos]);
  return {
    grupos,
    primeiros,
    vazia: postos.length === 0,
    titulo: tituloContagem(postos.length),
    sentido,
    definirSentido,
  };
}
