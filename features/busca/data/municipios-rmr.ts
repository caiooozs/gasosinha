/**
 * Dados estáticos da busca (data-model.md, "Dados estáticos do front"). A fonte única é
 * `supabase/functions/_shared/regiao-rmr.ts`, a mesma usada pela ingestão.
 */
import { MUNICIPIOS_RMR, RMR_LIMITES, normalizarNomeMunicipio } from "@/supabase/functions/_shared/regiao-rmr";

export type { Limites, MunicipioRmr } from "@/supabase/functions/_shared/regiao-rmr";
export { MUNICIPIOS_RMR, normalizarNomeMunicipio };

/** Enquadramento inicial do mapa (FR-002): a união dos 15 municípios. */
export const REGIAO_PADRAO = RMR_LIMITES;
