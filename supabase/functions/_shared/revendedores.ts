/**
 * Leitura da API Revendedores da ANP (T029): o envelope paginado e cada registro.
 */
import { FormatoInesperadoError } from "./erros.ts";
import { EnvelopeRevendedores, RevendedorAnp, motivoDoErro, type PostoNormalizado } from "./schemas.ts";

export { FormatoInesperadoError } from "./erros.ts";
export type { PostoNormalizado } from "./schemas.ts";

export type PaginaRevendedores = { registros: unknown[]; totalPagina: number; totalRegistro: number };

export type ResultadoRevendedor =
  | { tipo: "valido"; posto: PostoNormalizado }
  | { tipo: "ignorado" }
  | { tipo: "rejeitado"; motivo: string };

/** Valida o envelope. Envelope fora do formato é falha da fonte (422). */
export function parseEnvelopeRevendedores(json: unknown): PaginaRevendedores {
  const r = EnvelopeRevendedores.safeParse(json);
  if (!r.success) {
    throw new FormatoInesperadoError("envelope_invalido", r.error.issues.map((i) => i.path.join(".")).join(", "));
  }
  return {
    registros: r.data.data ?? [],
    totalPagina: r.data.searchPageFilter.totalPagina,
    totalRegistro: r.data.searchPageFilter.totalRegistro,
  };
}

/** Normaliza um registro. Fora da RMR é ignorado; fora do formato é rejeitado com o motivo. */
export function parseRevendedor(registro: unknown): ResultadoRevendedor {
  const r = RevendedorAnp.safeParse(registro);
  if (!r.success) return { tipo: "rejeitado", motivo: motivoDoErro(r.error, "registro_invalido") };
  return r.data;
}
