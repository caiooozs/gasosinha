-- RPC postos_na_area (T053). ÁREA SENSÍVEL (Princípio IX): só entra depois de revisão humana.
-- Contrato: specs/001-gas-price-map/contracts/supabase-rpc.md.
--
-- Recebe só a área visível do mapa, já quantizada pelo front na grade de 0,02° (R13). Nunca recebe
-- a posição da pessoa (Princípio III). Só lê tabelas com select público e roda como quem chama
-- (security invoker), então passa pela RLS de só leitura (Princípio II).

create or replace function public.postos_na_area(
  oeste double precision,
  sul double precision,
  leste double precision,
  norte double precision
)
returns table (
  cnpj text,
  nome text,
  bandeira text,
  municipio text,
  lat double precision,
  lng double precision,
  preco_atual numeric,
  data_atual date,
  preco_anterior numeric,
  data_anterior date,
  fonte text
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with area as (
    -- Defesa em profundidade: arredonda para fora na grade de 0,02° também aqui (em numeric, sem
    -- erro de ponto flutuante) e recorta no retângulo da RMR com 0,05° de margem, já na grade:
    -- [-35.32, -8.66, -34.74, -7.40], o mesmo que quantizarBbox (features/postos/domain/bbox.ts)
    -- calcula a partir de RMR_LIMITES (supabase/functions/_shared/regiao-rmr.ts).
    select
      greatest(floor(postos_na_area.oeste::numeric * 50) / 50, -35.32)::double precision as o,
      greatest(floor(postos_na_area.sul::numeric * 50) / 50, -8.66)::double precision as s,
      least(ceil(postos_na_area.leste::numeric * 50) / 50, -34.74)::double precision as l,
      least(ceil(postos_na_area.norte::numeric * 50) / 50, -7.40)::double precision as n
  )
  select
    p.cnpj::text,
    p.razao_social,
    p.bandeira,
    p.municipio,
    p.lat,
    p.lng,
    ultimas.preco_atual,
    ultimas.data_atual,
    ultimas.preco_anterior,
    ultimas.data_anterior,
    ultimas.fonte
  from area a
  join public.postos p
    on p.ativo
   and p.localizacao is not null
   and p.localizacao && extensions.st_makeenvelope(a.o, a.s, a.l, a.n, 4326)::extensions.geography
  -- As duas coletas de gasolina comum mais recentes do posto, pelo índice único de precos.
  -- Sem coleta, o agregado devolve uma linha de nulos: o posto aparece como "sem preço".
  left join lateral (
    select
      max(u.preco) filter (where u.ordem = 1) as preco_atual,
      max(u.data_coleta) filter (where u.ordem = 1) as data_atual,
      max(u.fonte) filter (where u.ordem = 1) as fonte,
      max(u.preco) filter (where u.ordem = 2) as preco_anterior,
      max(u.data_coleta) filter (where u.ordem = 2) as data_anterior
    from (
      select
        pr.preco,
        pr.data_coleta,
        pr.fonte,
        row_number() over (order by pr.data_coleta desc) as ordem
      from public.precos pr
      where pr.cnpj = p.cnpj
        and pr.produto = 'gasolina_comum'
      order by pr.data_coleta desc
      limit 2
    ) u
  ) ultimas on true
  -- Área inválida (oeste >= leste ou sul >= norte, inclusive depois do recorte) não devolve nada.
  where a.o < a.l
    and a.s < a.n
  order by p.cnpj;
$$;

comment on function public.postos_na_area(double precision, double precision, double precision, double precision) is
  'Postos ativos com localização na área (quantizada em 0,02°), com as duas últimas coletas de gasolina comum.';

grant execute on function public.postos_na_area(double precision, double precision, double precision, double precision)
  to anon, authenticated;
