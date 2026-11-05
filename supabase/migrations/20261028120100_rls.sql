-- RLS de só leitura (T011). ÁREA SENSÍVEL (Princípio IX): só entra depois de revisão humana.
--
-- Princípio II: toda tabela exposta tem RLS. Para anon e authenticated, a única política é a de
-- leitura, e só nas tabelas públicas. A escrita acontece só pela service role (Edge Functions e
-- script de carga), que ignora a RLS.

alter table public.postos enable row level security;
alter table public.precos enable row level security;
alter table public.estado_fontes enable row level security;
alter table public.edicoes_lpc enable row level security;
alter table public.links_lpc enable row level security;
alter table public.execucoes_sync enable row level security;

create policy "leitura pública" on public.postos for select to anon, authenticated using (true);
create policy "leitura pública" on public.precos for select to anon, authenticated using (true);
create policy "leitura pública" on public.estado_fontes for select to anon, authenticated using (true);

-- edicoes_lpc, links_lpc e execucoes_sync não têm política: ficam inacessíveis para anon e
-- authenticated.

-- Defesa em profundidade: além da RLS, tira de anon e authenticated os privilégios de escrita.
-- (A RLS não cobre TRUNCATE.)
revoke insert, update, delete, truncate, references, trigger
  on public.postos, public.precos, public.estado_fontes
  from anon, authenticated;
revoke all
  on public.edicoes_lpc, public.links_lpc, public.execucoes_sync
  from anon, authenticated;
