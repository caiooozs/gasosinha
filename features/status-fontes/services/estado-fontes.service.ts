import { supabaseNavegador } from "@/lib/supabase/cliente-navegador";
import type { EstadoFonteLido } from "../domain/avaliar-status";

/** As duas linhas de `estado_fontes` (cadastro e precos), com as colunas do contrato. */
export async function buscarEstadoFontes(): Promise<EstadoFonteLido[]> {
  const { data, error } = await supabaseNavegador
    .from("estado_fontes")
    .select("fonte, ultima_ok_em, ultima_edicao_fim, em_problema, tipo_problema, problema_desde");
  if (error) throw new Error(`Falha ao ler o estado das fontes: ${error.message}`);
  return data ?? [];
}
