"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { DataISO } from "@/lib/formato";
import { agruparPostos } from "../domain/agrupar";
import { filtrarNaAreaVisivel, quantizarBbox } from "../domain/bbox";
import { planejarFoco, type PlanoFoco } from "../domain/foco";
import { cnpjsMaisBaratos } from "../domain/mais-barato";
import type { Bbox, PostoNoMapa } from "../domain/tipos";
import { buscarPostosNaArea } from "../services/postos.service";
import { chaves } from "./chaves";
import { montarMarcadores } from "./montar-vm";
import type { EstadoCarga, GrupoVM, MarcadorVM } from "./tipos";
import { useHoje } from "./useHoje";

export type EntradaPostosNaArea = {
  /** Área visível bruta do mapa; `null` até o mapa carregar. */
  bboxVisivel: Bbox | null;
  zoom: number;
  /** O "hoje" calculado no servidor (`hojeParaRender`). */
  hoje: DataISO;
  /** CNPJ do posto aberto no detalhe: o marcador dele fica destacado (D5). */
  selecionado?: string | null;
};

export type PostosNaArea = {
  estado: EstadoCarga;
  /** Postos da área quantizada; com erro, continuam os da última busca que deu certo. */
  postos: PostoNoMapa[];
  /** Só os postos dentro da área visível de fato: alimentam a lista (US1, cenário 8). */
  postosVisiveis: PostoNoMapa[];
  marcadores: MarcadorVM[];
  grupos: GrupoVM[];
  tentarDeNovo: () => void;
  /** Para onde o mapa vai para mostrar o posto sozinho, fora de um grupo (D5); `null` sem ele. */
  focoDoPosto: (cnpj: string) => PlanoFoco | null;
};

const NENHUM: PostoNoMapa[] = [];

/**
 * Postos da área visível do mapa (contracts/ui.md). Quantiza a área (R13), consulta o RPC,
 * agrupa os marcadores e monta rótulos e nomes acessíveis com o "hoje" de `useHoje`.
 */
export function usePostosNaArea({ bboxVisivel, zoom, hoje, selecionado = null }: EntradaPostosNaArea): PostosNaArea {
  const hojeAtual = useHoje(hoje);
  const bboxQuantizada = useMemo(() => (bboxVisivel ? quantizarBbox(bboxVisivel) : null), [bboxVisivel]);
  const foraDaRegiao = bboxVisivel !== null && bboxQuantizada === null;

  const consulta = useQuery({
    queryKey: bboxQuantizada ? chaves.postosNaArea(bboxQuantizada) : ["postos-na-area", "sem-area"],
    queryFn: () => (bboxQuantizada ? buscarPostosNaArea(bboxQuantizada) : Promise.resolve(NENHUM)),
    // A área só existe depois que o mapa carrega.
    enabled: bboxQuantizada !== null,
    placeholderData: keepPreviousData,
  });

  // Os últimos postos que chegaram de fato: se a busca de uma área nova falhar, eles continuam na
  // tela (o placeholder do TanStack some quando a consulta nova termina em erro).
  const [ultimosPostos, setUltimosPostos] = useState<PostoNoMapa[] | undefined>(undefined);
  if (consulta.data !== undefined && !consulta.isPlaceholderData && consulta.data !== ultimosPostos) {
    setUltimosPostos(consulta.data);
  }

  const postos = foraDaRegiao ? NENHUM : (consulta.data ?? (consulta.isError ? ultimosPostos : undefined) ?? NENHUM);

  const postosVisiveis = useMemo(
    () => (bboxVisivel ? filtrarNaAreaVisivel(postos, bboxVisivel) : NENHUM),
    [postos, bboxVisivel],
  );

  const { marcadores, grupos } = useMemo(() => {
    if (!bboxVisivel) return { marcadores: [], grupos: [] };
    // O "mais barato" é o da área visível, o mesmo que a lista mostra.
    const maisBaratos = cnpjsMaisBaratos(postosVisiveis, hojeAtual);
    return montarMarcadores(agruparPostos(postos, bboxQuantizada ?? bboxVisivel, zoom), hojeAtual, maisBaratos, selecionado);
  }, [postos, postosVisiveis, bboxVisivel, bboxQuantizada, zoom, hojeAtual, selecionado]);

  let estado: EstadoCarga = "pronto";
  if (consulta.isError && !foraDaRegiao) estado = "erro";
  else if (bboxVisivel === null || (consulta.data === undefined && !foraDaRegiao)) estado = "carregando";

  const { refetch } = consulta;
  return {
    estado,
    postos,
    postosVisiveis,
    marcadores,
    grupos,
    tentarDeNovo: () => void refetch(),
    // Os mesmos postos e o mesmo zoom dos marcadores, para o posto aparecer sozinho de fato.
    focoDoPosto: (cnpj) => planejarFoco(postos, cnpj, zoom),
  };
}
