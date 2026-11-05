import { supabaseNavegador } from "@/lib/supabase/cliente-navegador";
import type { BboxQuantizada } from "../domain/bbox";
import type { PostoNoMapa } from "../domain/tipos";
import { linhaParaPosto, type LinhaPostosNaArea } from "./linha-postos";

/**
 * Postos da área visível, pelo RPC `postos_na_area` (contracts/supabase-rpc.md). Só a área
 * quantizada sai do aparelho; nunca a posição da pessoa (Princípio III, R13).
 */
export async function buscarPostosNaArea([oeste, sul, leste, norte]: BboxQuantizada): Promise<PostoNoMapa[]> {
  const { data, error } = await supabaseNavegador.rpc("postos_na_area", { oeste, sul, leste, norte });
  if (error) throw new Error(`Falha ao buscar os postos da área: ${error.message}`);
  const linhas: readonly LinhaPostosNaArea[] = data ?? [];
  return linhas.map(linhaParaPosto).filter((p): p is PostoNoMapa => p !== null);
}
