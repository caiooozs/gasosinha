import Supercluster, { type PointFeature } from "supercluster";
import { OPCOES_AGRUPAMENTO } from "./agrupar";
import type { PostoNoMapa } from "./tipos";

/** Para onde o mapa vai ao focar um posto: o centro e o zoom. */
export type PlanoFoco = { lng: number; lat: number; zoom: number };

type Propriedades = { cnpj: string };

// Uma caixa minúscula em volta do posto: no zoom em que ele está sozinho, o próprio ponto cai nela.
const RAIO_CAIXA = 1e-4;

const valido = (p: PostoNoMapa) => Number.isFinite(p.lat) && Number.isFinite(p.lng);

/**
 * Plano para focar o posto escolhido na lista (D5): centraliza nele e aproxima só o necessário
 * para ele aparecer sozinho, fora de um grupo. Se ele já aparece sozinho no zoom atual, o zoom
 * fica como está. A posição vem dos postos da área, nunca da posição da pessoa (Princípio III).
 * Sem o posto, ou sem coordenada válida, devolve `null`.
 */
export function planejarFoco(postos: readonly PostoNoMapa[], cnpj: string, zoomAtual: number): PlanoFoco | null {
  const alvo = postos.find((p) => p.cnpj === cnpj && valido(p));
  if (!alvo) return null;

  const pontos = postos.filter(valido).map(
    (p): PointFeature<Propriedades> => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      properties: { cnpj: p.cnpj },
    }),
  );
  const indice = new Supercluster<Propriedades>(OPCOES_AGRUPAMENTO).load(pontos);
  const caixa: [number, number, number, number] = [
    alvo.lng - RAIO_CAIXA,
    alvo.lat - RAIO_CAIXA,
    alvo.lng + RAIO_CAIXA,
    alvo.lat + RAIO_CAIXA,
  ];

  // O agrupamento usa o zoom inteiro (o mesmo que `agruparPostos` usa para os marcadores).
  const inicio = Math.max(0, Math.floor(zoomAtual));
  for (let zoom = inicio; zoom <= OPCOES_AGRUPAMENTO.maxZoom; zoom++) {
    const sozinho = indice
      .getClusters(caixa, zoom)
      .some((f) => !("cluster" in f.properties && f.properties.cluster) && (f.properties as Propriedades).cnpj === cnpj);
    if (sozinho) return { lng: alvo.lng, lat: alvo.lat, zoom: zoom === inicio ? zoomAtual : zoom };
  }
  // Acima do zoom máximo do agrupamento, todo posto aparece sozinho.
  return { lng: alvo.lng, lat: alvo.lat, zoom: Math.max(zoomAtual, OPCOES_AGRUPAMENTO.maxZoom + 1) };
}
