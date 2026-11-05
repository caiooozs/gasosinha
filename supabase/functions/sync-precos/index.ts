// Edge Function sync-precos (T036): arquivos semanais do LPC da ANP, todo dia.
// ÁREA SENSÍVEL (Princípio IX). A lógica fica em ../_shared/infra/sync-precos.ts, testada no Vitest.
// Deploy: npx supabase functions deploy sync-precos --no-verify-jwt --use-api --import-map supabase/functions/deno.json
import { createClient } from "@supabase/supabase-js";
import { criarBancoSupabase } from "../_shared/infra/banco.ts";
import { executarSyncPrecos } from "../_shared/infra/sync-precos.ts";

Deno.serve(async (req: Request) => {
  const ler = (nome: string) => Deno.env.get(nome) || undefined;
  const supabaseUrl = ler("SUPABASE_URL");
  const serviceRole = ler("SUPABASE_SERVICE_ROLE_KEY");
  const cronSecret = ler("CRON_SECRET");
  if (!supabaseUrl || !serviceRole || !cronSecret) {
    return Response.json({ ok: false, erro: "configuracao_ausente" }, { status: 500 });
  }

  const cliente = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
  const resposta = await executarSyncPrecos(
    { metodo: req.method, segredo: req.headers.get("x-cron-secret") },
    {
      banco: criarBancoSupabase(cliente),
      ambiente: { cronSecret, siteUrl: ler("SITE_URL"), lpcPaginaUrl: ler("LPC_PAGINA_URL") },
    },
  );
  return Response.json(resposta.corpo, { status: resposta.status });
});
