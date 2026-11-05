"use client";

import { useMemo, useState } from "react";
import type { Limites, MunicipioRmr } from "../data/municipios-rmr";
import { buscarMunicipio } from "../domain/buscar-municipio";

export type BuscaCidadeVM = {
  texto: string;
  setTexto: (texto: string) => void;
  resultados: MunicipioRmr[];
  selecionar: (municipio: MunicipioRmr) => void;
};

/** Busca de cidade da RMR (FR-006), local e sem rede. Selecionar centraliza o mapa no município. */
export function useBuscaCidade(aoSelecionar: (limites: Limites) => void): BuscaCidadeVM {
  const [texto, setTexto] = useState("");
  const resultados = useMemo(() => buscarMunicipio(texto), [texto]);
  return {
    texto,
    setTexto,
    resultados,
    selecionar: (municipio) => {
      setTexto(municipio.nome);
      aoSelecionar(municipio.limites);
    },
  };
}
