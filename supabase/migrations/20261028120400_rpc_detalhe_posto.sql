-- RPCs do detalhe do posto (T079). ÁREA SENSÍVEL (Princípio IX): só entra depois de revisão humana.
-- Contrato: specs/001-gas-price-map/contracts/supabase-rpc.md.
--
-- Só leem tabelas com select público e rodam como quem chama (security invoker), então passam pela
-- RLS de só leitura (Princípio II).

-- Detalhe e histórico de um posto (P2 e P3). Devolve null se o CNPJ estiver fora do formato ou não
-- existir. Postos inativos também são devolvidos, com "ativo": false, para quem abrir um link antigo.
create or replace function public.detalhe_posto(p_cnpj text)
returns json
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select json_build_object(
    'cnpj', p.cnpj::text,
    'nome', p.razao_social,
    'bandeira', p.bandeira,
    'endereco', p.endereco,
    'bairro', p.bairro,
    'municipio', p.municipio,
    'lat', p.lat,
    'lng', p.lng,
    'ativo', p.ativo,
    -- Todo o histórico guardado de gasolina comum, da coleta mais recente para a mais antiga (FR-014).
    'coletas', coalesce(
      (
        select json_agg(
          json_build_object('data', pr.data_coleta, 'preco', pr.preco, 'fonte', pr.fonte)
          order by pr.data_coleta desc
        )
        from public.precos pr
        where pr.cnpj = p.cnpj
          and pr.produto = 'gasolina_comum'
      ),
      '[]'::json
    )
  )
  from public.postos p
  where detalhe_posto.p_cnpj ~ '^\d{14}$'
    and p.cnpj = detalhe_posto.p_cnpj;
$$;

comment on function public.detalhe_posto(text) is
  'Detalhe do posto com todo o histórico de gasolina comum; null se o CNPJ não existir.';

grant execute on function public.detalhe_posto(text) to anon, authenticated;

-- CNPJs dos postos ativos, para o generateStaticParams da página do posto.
create or replace function public.cnpjs_postos_ativos()
returns setof text
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select p.cnpj::text
  from public.postos p
  where p.ativo
  order by p.cnpj;
$$;

comment on function public.cnpjs_postos_ativos() is
  'CNPJs dos postos ativos (pré-renderização das páginas de posto).';

grant execute on function public.cnpjs_postos_ativos() to anon, authenticated;
