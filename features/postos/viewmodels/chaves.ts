import type { BboxQuantizada } from "../domain/bbox";

/**
 * Chaves do TanStack Query, num só lugar, para o servidor e o cliente usarem a mesma identidade.
 * A chave da área usa a área quantizada: pequenos arrastes reaproveitam a mesma consulta (R13).
 */
export const chaves = {
  postosNaArea: (bbox: BboxQuantizada) => ["postos-na-area", ...bbox] as const,
  detalhePosto: (cnpj: string) => ["detalhe-posto", cnpj] as const,
};
