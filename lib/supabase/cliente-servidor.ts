import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./tipos";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chavePublica = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !chavePublica) {
  throw new Error(
    "Supabase: faltam NEXT_PUBLIC_SUPABASE_URL e/ou NEXT_PUBLIC_SUPABASE_ANON_KEY. Copie o .env.example para .env.local e preencha.",
  );
}

/**
 * Cliente do Supabase para o servidor do Next (páginas, `'use cache'`). Usa a mesma chave pública
 * do navegador: o servidor do Next só lê dados públicos. A service role existe apenas nas Edge
 * Functions e no script de carga (Princípio II).
 */
export const supabaseServidor = createClient<Database>(url, chavePublica, {
  auth: { persistSession: false, autoRefreshToken: false },
});
