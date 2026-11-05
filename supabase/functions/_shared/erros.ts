/**
 * Formato inesperado numa fonte externa (arquivo, planilha ou resposta de API).
 *
 * É tratado como falha da fonte (resposta 422 nas Edge Functions), nunca corrigido por palpite
 * (Princípio I e FR-023).
 */
export class FormatoInesperadoError extends Error {
  readonly motivo: string;

  constructor(motivo: string, detalhe?: string) {
    super(detalhe ? `${motivo}: ${detalhe}` : motivo);
    this.name = "FormatoInesperadoError";
    this.motivo = motivo;
  }
}
