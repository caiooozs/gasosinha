import { diasEntre, type DataISO, type UnidadeIdade } from "@/lib/formato";

/** Coleta com mais de 28 dias é antiga (FR-011, FR-029). */
export const DIAS_COLETA_RECENTE = 28;

export type IdadeColeta = {
  dias: number;
  unidade: UnidadeIdade;
  valor: number;
  antiga: boolean;
};

/**
 * Idade da coleta em relação a `hoje` (no fuso de São Paulo, passado como argumento):
 * até 13 dias em dias, até 84 dias (12 semanas) em semanas e, depois, em meses de 30 dias.
 */
export function calcularIdade(dataColeta: DataISO, hoje: DataISO): IdadeColeta {
  // Uma data posterior a hoje (fonte com relógio adiantado) conta como hoje.
  const dias = Math.max(0, diasEntre(dataColeta, hoje));
  const antiga = dias > DIAS_COLETA_RECENTE;
  if (dias < 14) return { dias, unidade: "dias", valor: dias, antiga };
  if (dias <= 84) return { dias, unidade: "semanas", valor: Math.floor(dias / 7), antiga };
  return { dias, unidade: "meses", valor: Math.floor(dias / 30), antiga };
}
