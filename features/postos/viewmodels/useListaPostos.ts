"use client";

import { useMemo, useState } from "react";
import type { DataISO } from "@/lib/formato";
import type { SentidoPreco } from "../domain/ordenar-lista";
import { paginarGrupos, textoMostrarMais } from "../domain/paginar";
import type { PostoNoMapa } from "../domain/tipos";
import { montarGruposLista, montarRegua, tituloContagem } from "./montar-vm";
import type { GrupoListaVM, ItemListaVM, MostrarMaisVM, ReguaVM } from "./tipos";
import { useHoje } from "./useHoje";
import { usePaginacao } from "./usePaginacao";

const QUANTOS_NA_FOLHA = 2;
/** Quantos postos a lista mostra de cada vez (D2). */
const POSTOS_POR_PAGINA = 20;
const NOME_POSTOS = { singular: "posto", plural: "postos", feminino: false };

export type ListaPostosVM = {
  /** Os grupos da página visível: os primeiros postos, na ordem escolhida (D2). */
  grupos: GrupoListaVM[];
  /** As primeiras linhas, na ordem escolhida: a folha do mapa no celular mostra estas. */
  primeiros: ItemListaVM[];
  vazia: boolean;
  /** "8 postos nesta área": sempre o total da área, não só a página visível. */
  titulo: string;
  /** A régua de preços da área, ou `null` sem duas coletas recentes com preços diferentes. */
  regua: ReguaVM | null;
  sentido: SentidoPreco;
  definirSentido: (sentido: SentidoPreco) => void;
  /** `null` quando todos os postos da área já estão à vista. */
  mostrarMais: MostrarMaisVM | null;
};

/**
 * Lista da área visível (FR-010 a FR-012): recebe os `postosVisiveis` de `usePostosNaArea` e o
 * "hoje" do servidor. O sentido da ordem de preço e a página ficam em estado local. A página volta
 * para o começo quando a área (o conjunto de postos) ou a ordem mudam, e o mais barato continua no
 * topo (SC-004).
 */
export function useListaPostos(postos: readonly PostoNoMapa[], hoje: DataISO): ListaPostosVM {
  const hojeAtual = useHoje(hoje);
  const [sentido, definirSentido] = useState<SentidoPreco>("asc");
  const todos = useMemo(() => montarGruposLista(postos, hojeAtual, sentido), [postos, hojeAtual, sentido]);
  const primeiros = useMemo(() => todos.flatMap((g) => g.itens).slice(0, QUANTOS_NA_FOLHA), [todos]);
  const regua = useMemo(() => montarRegua(postos, hojeAtual), [postos, hojeAtual]);

  const chave = useMemo(() => `${sentido}|${postos.map((p) => p.cnpj).join(",")}`, [postos, sentido]);
  const { quantidade, mostrarMais } = usePaginacao(chave, POSTOS_POR_PAGINA, POSTOS_POR_PAGINA);
  const pagina = useMemo(() => paginarGrupos(todos, quantidade), [todos, quantidade]);

  return {
    grupos: pagina.grupos,
    primeiros,
    vazia: postos.length === 0,
    titulo: tituloContagem(postos.length),
    regua,
    sentido,
    definirSentido,
    mostrarMais:
      pagina.restantes > 0
        ? { texto: textoMostrarMais(pagina.restantes, POSTOS_POR_PAGINA, NOME_POSTOS), onMostrarMais: mostrarMais }
        : null,
  };
}
