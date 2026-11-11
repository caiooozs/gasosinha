import Supercluster, { type PointFeature } from "supercluster";
import type { Bbox, PostoNoMapa } from "./tipos";

export type ItemAgrupado =
  | { tipo: "posto"; posto: PostoNoMapa }
  | { tipo: "grupo"; id: number; lng: number; lat: number; quantidade: number; zoomExpansao: number };

type Propriedades = { posto: PostoNoMapa };

/** Mesmos parâmetros do agrupamento interno do MapLibre: 60 px de raio, agrupa até o zoom 15. */
export const OPCOES_AGRUPAMENTO = { radius: 60, maxZoom: 15 } as const;
const OPCOES = OPCOES_AGRUPAMENTO;

/**
 * Agrupa os postos que se sobrepõem no zoom atual (FR-009, R12), dentro da área `bbox`.
 * Postos sem coordenada válida ficam de fora (nunca são posicionados por palpite).
 */
export function agruparPostos(postos: readonly PostoNoMapa[], bbox: Bbox, zoom: number): ItemAgrupado[] {
  const pontos = postos
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    .map(
      (posto): PointFeature<Propriedades> => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [posto.lng, posto.lat] },
        properties: { posto },
      }),
    );
  if (pontos.length === 0) return [];

  const indice = new Supercluster<Propriedades>(OPCOES).load(pontos);
  return indice.getClusters([bbox[0], bbox[1], bbox[2], bbox[3]], zoom).map((feature): ItemAgrupado => {
    const [lng, lat] = feature.geometry.coordinates;
    if ("cluster" in feature.properties && feature.properties.cluster) {
      const id = feature.properties.cluster_id;
      return {
        tipo: "grupo",
        id,
        lng,
        lat,
        quantidade: feature.properties.point_count,
        zoomExpansao: indice.getClusterExpansionZoom(id),
      };
    }
    return { tipo: "posto", posto: (feature.properties as Propriedades).posto };
  });
}
