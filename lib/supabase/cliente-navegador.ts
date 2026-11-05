import { createClient } from "@supabase/supabase-js";
import type { Database } from "./tipos";

// As variáveis NEXT_PUBLIC_ precisam ser lidas por extenso para o Next embuti-las no código do
// navegador (uma leitura dinâmica não seria substituída no build).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chavePublica = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !chavePublica) {
  throw new Error(
    "Supabase: faltam NEXT_PUBLIC_SUPABASE_URL e/ou NEXT_PUBLIC_SUPABASE_ANON_KEY. Copie o .env.example para .env.local e preencha.",
  );
}

/**
 * Cliente do Supabase para o navegador. Usa só a chave pública (anon ou publishable): lê dados
 * públicos, protegidos por RLS de só leitura (Princípio II). Nunca usa a service role.
 */
export const supabaseNavegador = createClient<Database>(url, chavePublica, {
  auth: { persistSession: false },
});
