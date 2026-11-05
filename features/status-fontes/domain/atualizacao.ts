import { hojeEmSaoPaulo, type DataISO } from "@/lib/formato";
import type { EstadoFonteLido } from "./avaliar-status";

/**
 * A data (AAAA-MM-DD, fuso de São Paulo) da última sincronização bem-sucedida dos preços, para a
 * atribuição permanente "Preços: ANP · atualizado em dd/mm/aaaa" (FR-030). `null` se não houver.
 */
export function dataAtualizacaoPrecos(estados: readonly EstadoFonteLido[]): DataISO | null {
  const okEm = estados.find((e) => e.fonte === "precos")?.ultima_ok_em;
  if (!okEm) return null;
  const ms = Date.parse(okEm);
  return Number.isNaN(ms) ? null : hojeEmSaoPaulo(new Date(ms));
}
