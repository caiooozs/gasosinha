import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { supabaseServidor } from "@/lib/supabase/cliente-servidor";
import type { DetalhePostoDados } from "../domain/detalhe";
import { lerDetalheRpc } from "./detalhe-rpc";

/** Tag do cache do posto, para uma invalidação futura pelo CNPJ. */
export const tagDoPosto = (cnpj: string) => `posto:${cnpj}`;

/**
 * Detalhe do posto no servidor do Next, em cache por algumas horas (R11): os preços mudam no
 * máximo uma vez por dia. Usa só a chave pública (Princípio II).
 */
export async function buscarDetalhePostoServidor(cnpj: string): Promise<DetalhePostoDados | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(tagDoPosto(cnpj));
  const { data, error } = await supabaseServidor.rpc("detalhe_posto", { p_cnpj: cnpj });
  if (error) throw new Error(`Falha ao buscar o posto ${cnpj}: ${error.message}`);
  return lerDetalheRpc(data);
}

/** CNPJs dos postos ativos, para pré-renderizar as páginas de posto. */
export async function listarCnpjsAtivos(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  const { data, error } = await supabaseServidor.rpc("cnpjs_postos_ativos");
  if (error) throw new Error(`Falha ao listar os postos ativos: ${error.message}`);
  return (data ?? []).filter((cnpj): cnpj is string => typeof cnpj === "string" && /^\d{14}$/.test(cnpj));
}
