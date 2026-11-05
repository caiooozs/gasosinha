/**
 * Os 15 municípios da Região Metropolitana do Recife (T022). Fonte única, usada pela ingestão e
 * pela busca do front.
 *
 * Códigos: https://servicodados.ibge.gov.br/api/v1/localidades/estados/PE/municipios
 * Limites: retângulo envolvente da malha de cada município em
 * https://servicodados.ibge.gov.br/api/v3/malhas/municipios/{codigo}?formato=application/vnd.geo+json
 * Consultados uma vez, em 2026-11-04, e arredondados a 4 casas (cerca de 11 m).
 *
 * Sem APIs de Deno nem de Node.
 */

/** [oeste, sul, leste, norte], em graus (longitude, latitude). */
export type Limites = readonly [oeste: number, sul: number, leste: number, norte: number];

export type MunicipioRmr = {
  readonly codigoIbge: string;
  readonly nome: string;
  readonly nomeNormalizado: string;
  readonly limites: Limites;
};

export function normalizarNomeMunicipio(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " ");
}

const municipio = (codigoIbge: string, nome: string, limites: Limites): MunicipioRmr => ({
  codigoIbge,
  nome,
  nomeNormalizado: normalizarNomeMunicipio(nome),
  limites,
});

export const MUNICIPIOS_RMR: readonly MunicipioRmr[] = [
  municipio("2600054", "Abreu e Lima", [-35.14, -7.936, -34.8608, -7.7923]),
  municipio("2601052", "Araçoiaba", [-35.14, -7.88, -35.0204, -7.7228]),
  municipio("2602902", "Cabo de Santo Agostinho", [-35.266, -8.3667, -34.9245, -8.1842]),
  municipio("2603454", "Camaragibe", [-35.0367, -8.0377, -34.9612, -7.9251]),
  municipio("2606200", "Goiana", [-35.0778, -7.7144, -34.8067, -7.462]),
  municipio("2606804", "Igarassu", [-35.0997, -7.9, -34.8407, -7.6907]),
  municipio("2607604", "Ilha de Itamaracá", [-34.8902, -7.8164, -34.8232, -7.6878]),
  municipio("2607208", "Ipojuca", [-35.2381, -8.6094, -34.9567, -8.3099]),
  municipio("2607752", "Itapissuma", [-34.9432, -7.8081, -34.8624, -7.6824]),
  municipio("2607901", "Jaboatão dos Guararapes", [-35.0971, -8.2424, -34.9088, -8.0558]),
  municipio("2609402", "Moreno", [-35.2272, -8.2248, -35.0582, -8.0753]),
  municipio("2609600", "Olinda", [-34.9169, -8.0445, -34.828, -7.9547]),
  municipio("2610707", "Paulista", [-35.031, -7.9808, -34.8201, -7.8396]),
  municipio("2611606", "Recife", [-35.0167, -8.1551, -34.859, -7.9292]),
  municipio("2613701", "São Lourenço da Mata", [-35.2223, -8.0925, -34.9933, -7.9402]),
];

/** União dos 15 retângulos: o enquadramento da RMR inteira. */
export const RMR_LIMITES: Limites = [
  Math.min(...MUNICIPIOS_RMR.map((m) => m.limites[0])),
  Math.min(...MUNICIPIOS_RMR.map((m) => m.limites[1])),
  Math.max(...MUNICIPIOS_RMR.map((m) => m.limites[2])),
  Math.max(...MUNICIPIOS_RMR.map((m) => m.limites[3])),
];

const NOMES_RMR = new Set(MUNICIPIOS_RMR.map((m) => m.nomeNormalizado));

export function ehMunicipioRmr(nome: string): boolean {
  return NOMES_RMR.has(normalizarNomeMunicipio(nome));
}

/** O ponto cai no retângulo da RMR, com `margem` graus de folga em cada lado. */
export function dentroDaRmr(lat: number, lng: number, margem = 0.05): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  const [oeste, sul, leste, norte] = RMR_LIMITES;
  return lng >= oeste - margem && lng <= leste + margem && lat >= sul - margem && lat <= norte + margem;
}
