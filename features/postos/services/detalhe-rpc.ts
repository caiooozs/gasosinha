import { z } from "zod";
import type { DetalhePostoDados } from "../domain/detalhe";

/** Reais → milésimos inteiros (6.59 → 6590), sem deixar o artefato de ponto flutuante passar. */
const precoEmMilesimos = z.union([z.number(), z.string()]).transform((valor, ctx) => {
  const milesimos = Math.round(Number(valor) * 1000);
  if (!Number.isFinite(milesimos) || milesimos <= 0) {
    ctx.addIssue({ code: "custom", message: `preço inválido: ${valor}` });
    return z.NEVER;
  }
  return milesimos;
});

const ColetaRpc = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  preco: precoEmMilesimos,
  fonte: z.string().min(1),
});

/** O JSON do RPC `detalhe_posto` (contracts/supabase-rpc.md). */
const DetalheRpc = z.object({
  cnpj: z.string().regex(/^\d{14}$/),
  nome: z.string(),
  bandeira: z.string().nullable(),
  endereco: z.string(),
  bairro: z.string().nullable(),
  municipio: z.string(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  ativo: z.boolean(),
  coletas: z.array(ColetaRpc).nullable(),
});

/**
 * Valida e converte o JSON do RPC `detalhe_posto`. `null` quando o posto não existe; um formato
 * inesperado lança erro, para a tela mostrar a falha em vez de um dado errado (Princípio I).
 */
export function lerDetalheRpc(json: unknown): DetalhePostoDados | null {
  if (json === null || json === undefined) return null;
  const dados = DetalheRpc.parse(json);
  const coletas = (dados.coletas ?? [])
    .map((c) => ({ data: c.data, precoMilesimos: c.preco, fonte: c.fonte }))
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
  return { ...dados, coletas };
}
