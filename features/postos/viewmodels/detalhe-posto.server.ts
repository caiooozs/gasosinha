import "server-only";

import type { DehydratedState } from "@tanstack/react-query";
import { dehydrate } from "@/lib/hydrate";
import { montarMetadadosPosto } from "../domain/detalhe";
import { buscarDetalhePostoServidor, listarCnpjsAtivos, tagDoPosto } from "../services/postos.server";
import { chaves } from "./chaves";

const FORMATO_CNPJ = /^\d{14}$/;

/**
 * Viewmodel de servidor da página e do modal do posto (R11): busca o detalhe em cache e monta o
 * estado que o `<HydrationBoundary>` entrega ao `useDetalhePosto`, com a mesma chave.
 */
export async function montarEstadoDetalhe(
  cnpj: string,
): Promise<{ existe: boolean; estado: DehydratedState; centro: { lng: number; lat: number } | null }> {
  const dados = FORMATO_CNPJ.test(cnpj) ? await buscarDetalhePostoServidor(cnpj) : null;
  const estado = await dehydrate([{ queryKey: chaves.detalhePosto(cnpj), data: dados }], { tags: [tagDoPosto(cnpj)] });
  const centro = dados && dados.lat !== null && dados.lng !== null ? { lng: dados.lng, lat: dados.lat } : null;
  return { existe: dados !== null, estado, centro };
}

/** CNPJs para o `generateStaticParams`. Com Cache Components, uma lista vazia quebra o build. */
export async function listarCnpjsParaPrerender(): Promise<string[]> {
  const cnpjs = await listarCnpjsAtivos();
  if (cnpjs.length === 0) {
    throw new Error("Nenhum posto ativo para pré-renderizar: confira a carga do cadastro (sync-postos) antes do build.");
  }
  return cnpjs;
}

/** Título e descrição para o `generateMetadata`; `null` se o posto não existir. */
export async function metadadosPosto(cnpj: string): Promise<{ titulo: string; descricao: string } | null> {
  if (!FORMATO_CNPJ.test(cnpj)) return null;
  const dados = await buscarDetalhePostoServidor(cnpj);
  return dados ? montarMetadadosPosto(dados) : null;
}
