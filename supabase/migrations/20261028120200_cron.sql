-- Agendamento das Edge Functions (T037). ÁREA SENSÍVEL (Princípio IX): só entra depois de revisão
-- humana.
--
-- ANTES DE APLICAR, crie no Vault os 3 segredos que os jobs leem (quickstart, seção 2). Os valores
-- são digitados no SQL Editor e não vão para o repositório:
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/sync-precos', 'sync_precos_url');
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/sync-postos', 'sync_postos_url');
--   select vault.create_secret('<o mesmo valor de CRON_SECRET>', 'cron_secret');
--
-- Nenhum segredo aparece neste arquivo: os jobs leem a URL e o x-cron-secret do Vault a cada
-- execução.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- Preços: todo dia às 12:00 UTC (09:00 em Brasília).
select cron.schedule(
  'sync-precos-diario',
  '0 12 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'sync_precos_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);

-- Cadastro de postos: toda segunda-feira às 09:00 UTC (06:00 em Brasília).
select cron.schedule(
  'sync-postos-semanal',
  '0 9 * * 1',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'sync_postos_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
