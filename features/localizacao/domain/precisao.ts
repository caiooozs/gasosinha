// Metros por pixel no zoom 0 do MapLibre, no equador: a circunferência da Terra em tiles de 512 px.
const METROS_POR_PIXEL_ZOOM_0 = 40_075_016.686 / 512;

/**
 * O raio, em pixels, do halo que mostra a precisão da posição (D7): a margem de erro informada pelo
 * aparelho, em metros, convertida para o zoom e a latitude do mapa. Precisão inválida ou zero não
 * desenha halo.
 */
export function raioEmPixels(precisaoMetros: number, latitude: number, zoom: number): number {
  if (!Number.isFinite(precisaoMetros) || precisaoMetros <= 0) return 0;
  const metrosPorPixel = (METROS_POR_PIXEL_ZOOM_0 * Math.cos((latitude * Math.PI) / 180)) / 2 ** zoom;
  return precisaoMetros / metrosPorPixel;
}
