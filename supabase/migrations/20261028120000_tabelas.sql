-- Tabelas do Gasosinha (T010). ÁREA SENSÍVEL (Princípio IX): só entra depois de revisão humana.
-- O modelo e as regras de cada campo estão em specs/001-gas-price-map/data-model.md.

create extension if not exists postgis with schema extensions;

-- Cadastro de postos autorizados (fonte: API Revendedores da ANP).
create table public.postos (
  cnpj char(14) primary key check (cnpj ~ '^\d{14}$'),
  razao_social text not null,
  bandeira text null,
  endereco text not null,
  bairro text null,
  cep char(8) null check (cep ~ '^\d{8}$'),
  municipio text not null,
  uf char(2) not null,
  localizacao extensions.geography(Point, 4326) null,
  -- Coordenadas em graus, derivadas da localização, para ler sem decodificar o tipo geográfico
  -- (o PostgREST devolve geography em binário). Usadas pelo sync-postos e pelos RPCs.
  lat double precision generated always as (extensions.st_y(localizacao::extensions.geometry)) stored,
  lng double precision generated always as (extensions.st_x(localizacao::extensions.geometry)) stored,
  acuracia_estimada text null,
  origem_localizacao text null,
  ativo boolean not null default true,
  desativado_em timestamptz null,
  -- Última vez em que algum dado do posto mudou. Uma execução sem mudança não altera a linha.
  atualizado_em timestamptz not null
);

create index postos_localizacao_idx on public.postos using gist (localizacao);
create index postos_ativo_idx on public.postos (ativo) where ativo;

comment on table public.postos is 'Postos autorizados da RMR (API Revendedores da ANP).';

-- Edições semanais do LPC já vistas pela ingestão.
create table public.edicoes_lpc (
  id bigint generated always as identity primary key,
  periodo_inicio date not null,
  periodo_fim date not null,
  url text not null,
  sha256 char(64) not null,
  status text not null default 'em_andamento'
    check (status in ('em_andamento', 'concluida', 'fora_da_janela')),
  processada_em timestamptz null,
  contagens jsonb null,
  unique (periodo_inicio, periodo_fim),
  check (periodo_inicio <= periodo_fim)
);

comment on table public.edicoes_lpc is 'Edições semanais do LPC: em andamento, concluídas ou fora da janela de 12 meses.';

-- URLs do LPC que já tiveram desfecho final; não são baixadas de novo.
create table public.links_lpc (
  url text primary key,
  edicao_id bigint not null references public.edicoes_lpc (id),
  resultado text not null check (resultado in ('concluida', 'ja_processada', 'fora_da_janela')),
  visto_em timestamptz not null default now()
);

comment on table public.links_lpc is 'URLs do LPC com desfecho final (edição concluída, já processada ou fora da janela).';

-- Coletas de preço (fonte: LPC semanal da ANP). Sem chave estrangeira para postos: um preço de
-- CNPJ desconhecido fica guardado (FR-024), mas não aparece na tela.
create table public.precos (
  cnpj char(14) not null check (cnpj ~ '^\d{14}$'),
  produto text not null check (produto = 'gasolina_comum'),
  data_coleta date not null,
  preco numeric(6, 3) not null check (preco > 0 and preco < 50),
  fonte text not null,
  edicao_id bigint not null references public.edicoes_lpc (id),
  criado_em timestamptz not null default now(),
  unique (cnpj, produto, data_coleta)
);

comment on table public.precos is 'Coletas de gasolina comum do LPC. A chave única atende às buscas pelas últimas coletas do posto.';

-- Registro interno de cada execução das Edge Functions.
create table public.execucoes_sync (
  id bigint generated always as identity primary key,
  fonte text not null check (fonte in ('cadastro', 'precos')),
  iniciada_em timestamptz not null,
  terminada_em timestamptz null,
  resultado text not null check (resultado in ('ok', 'falha')),
  detalhe text null,
  contagens jsonb null
);

create index execucoes_sync_fonte_idx on public.execucoes_sync (fonte, iniciada_em desc);

comment on table public.execucoes_sync is 'Registro interno das execuções de sync-postos e sync-precos.';

-- Situação de cada fonte; alimenta o aviso público do site (FR-027).
create table public.estado_fontes (
  fonte text primary key check (fonte in ('cadastro', 'precos')),
  ultima_ok_em timestamptz null,
  ultima_edicao_fim date null,
  em_problema boolean not null default false,
  tipo_problema text null check (tipo_problema in ('falha', 'atraso')),
  problema_desde timestamptz null
);

comment on table public.estado_fontes is 'Situação de cada fonte; alimenta o aviso público de fonte com problema.';

insert into public.estado_fontes (fonte) values ('cadastro'), ('precos');
