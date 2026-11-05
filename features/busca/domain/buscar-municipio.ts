import { MUNICIPIOS_RMR, normalizarNomeMunicipio, type MunicipioRmr } from "../data/municipios-rmr";

/**
 * Busca local, sem rede, entre os 15 municípios da RMR (FR-006). Ignora maiúsculas, acentos e
 * espaços repetidos. Quem começa com o texto vem antes de quem só o contém; dentro de cada grupo,
 * a ordem é a alfabética da lista.
 */
export function buscarMunicipio(texto: string): MunicipioRmr[] {
  const busca = normalizarNomeMunicipio(texto);
  if (!busca) return [];
  const comecam: MunicipioRmr[] = [];
  const contem: MunicipioRmr[] = [];
  for (const municipio of MUNICIPIOS_RMR) {
    if (municipio.nomeNormalizado.startsWith(busca)) comecam.push(municipio);
    else if (municipio.nomeNormalizado.includes(busca)) contem.push(municipio);
  }
  return [...comecam, ...contem];
}
