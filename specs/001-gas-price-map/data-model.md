# Data Model: Gasosinha — Mapa de Preços da Gasolina por Posto

**Data**: 2026-10-27 | **Plano**: [plan.md](./plan.md) | **Pesquisa**: [research.md](./research.md)

Este documento descreve três camadas:
- as tabelas do Postgres (Supabase, com PostGIS);
- os dados estáticos do front;
- os tipos de domínio derivados.

Os nomes ficam em português, como no resto do projeto. O SQL completo fica nas migrations
(Fase 2), que só entram depois de revisão humana (Princípio IX).

## Visão geral

```text
postos 1 ── 0..* precos           (ligação lógica por cnpj, sem chave estrangeira; ver precos)
edicoes_lpc 1 ── 0..* precos      (de qual edição semanal veio a coleta)
edicoes_lpc 1 ── 0..* links_lpc   (URLs que já tiveram desfecho e não são baixadas de novo)
execucoes_sync                    (registro interno de cada execução)
estado_fontes                     (situação pública de cada fonte; alimenta o aviso)
```

## Tabelas

### `postos`: cadastro de postos autorizados (fonte: API Revendedores da ANP)

| Campo | Tipo | Regras |
|---|---|---|
| `cnpj` | `char(14)` PK | Apenas dígitos (`^\d{14}$`) e dígitos verificadores válidos (`normalizarCnpj`). |
| `razao_social` | `text` not null | Nome exibido como "nome do posto". |
| `bandeira` | `text` null | Vem de `distribuidora`. Se for nulo ou vazio, a tela mostra "bandeira não informada". |
| `endereco` | `text` not null | `endereco` + `complemento`, sem espaços duplicados. |
| `bairro` | `text` null | |
| `cep` | `char(8)` null | Apenas dígitos. |
| `municipio` | `text` not null | Nome normalizado de um dos 15 municípios da RMR. |
| `uf` | `char(2)` not null | Sempre `PE` no MVP. |
| `localizacao` | `geography(Point, 4326)` null | `null` quando falta coordenada ou ela cai fora da RMR (R2). Tem índice GiST. |
| `lat`, `lng` | `double precision`, colunas geradas (`stored`) | `st_y` e `st_x` de `localizacao`. Servem para ler as coordenadas sem decodificar o tipo geográfico, que o PostgREST devolve em binário: o `sync-postos` as compara com o cadastro, e os RPCs as devolvem. |
| `acuracia_estimada` | `text` null | Valor bruto de `estimativaAcuracia`, só informativo (R2). |
| `origem_localizacao` | `text` null | Valor bruto de `origemInformacao`. |
| `ativo` | `boolean` not null default `true` | `false` quando o posto sai do cadastro (FR-026). |
| `desativado_em` | `timestamptz` null | Preenchido na transição de ativo para inativo; limpo na reativação. |
| `atualizado_em` | `timestamptz` not null | Última vez em que algum dado do posto mudou: inclusão, alteração, desativação ou reativação. Uma execução sem mudança não altera a linha (SC-006). |

**Índices**: GiST em `localizacao`, e um índice parcial em `(ativo)` onde `ativo` é verdadeiro.

**Transição de estado** (feita pelo `sync-postos`):

```text
(novo no cadastro) ──► ativo
ativo ──(ausente de um retrato válido)──► inativo   [desativado_em = agora; o histórico continua]
inativo ──(volta ao cadastro)──► ativo              [desativado_em = null]
```

Um retrato só é válido se contiver pelo menos 80% dos postos ativos no banco (R1), ou seja, se
`|recebidos ∩ ativos| ≥ 0,8 × |ativos|`. Postos novos não contam para os 80%. Se o retrato não
for válido, a execução falha e nada é desativado.

A função pura `planejarSincronizacaoPostos(gravados, recebidos)`, em `_shared/retrato-postos.ts`,
decide o que inserir, atualizar, desativar e reativar, e o que fica inalterado. O `sync-postos`
só escreve nas linhas que mudaram, então rodá-lo de novo sem mudança na fonte não altera nada.

### `precos`: coletas de preço (fonte: LPC semanal da ANP)

| Campo | Tipo | Regras |
|---|---|---|
| `cnpj` | `char(14)` not null | Normalizado. **Sem chave estrangeira para `postos`**: um preço de CNPJ desconhecido fica guardado (FR-024), mas não aparece na tela. |
| `produto` | `text` not null | `check (produto = 'gasolina_comum')` no MVP (R9). |
| `data_coleta` | `date` not null | Convertida do serial do Excel. Tem de estar dentro do `PERÍODO` da edição. |
| `preco` | `numeric(6,3)` not null | `check (preco > 0 and preco < 50)`. Passa por `canonicalizarPreco` (R8). |
| `fonte` | `text` not null | `'ANP – Levantamento de Preços de Combustíveis'`. |
| `edicao_id` | `bigint` not null | FK para `edicoes_lpc(id)`. |
| `criado_em` | `timestamptz` not null default `now()` | |

**Chave**: `unique (cnpj, produto, data_coleta)`. O índice dessa chave atende as buscas "últimas
coletas do posto".

**Regras de escrita** (FR-022 e FR-023):
- **Gravação**: o upsert usa `on conflict do nothing`. Rodar de novo não altera nada.
- **Conflito dentro da mesma edição**: se o mesmo `(cnpj, produto, data_coleta)` aparece com
  preços diferentes, **nenhuma** das linhas é gravada, e as duas são contabilizadas como
  `rejeitadas` com o motivo `conflito_mesma_data`.
- **Conflito com coleta já gravada**: se a chave já existe com outro preço, o valor existente é
  mantido, e a linha nova é contabilizada como `rejeitadas` com o motivo
  `conflito_com_existente`.
- **Onde**: as regras de conflito com o que já está gravado e a contagem `sem_posto` ficam na
  função pura `classificarLote`, em `_shared/lote-precos.ts`, testada antes (Princípio V).

### `edicoes_lpc`: edições semanais já processadas

| Campo | Tipo | Regras |
|---|---|---|
| `id` | `bigint` identity PK | |
| `periodo_inicio` | `date` not null | Lido da linha `PERÍODO:` do arquivo. |
| `periodo_fim` | `date` not null | `unique (periodo_inicio, periodo_fim)`. |
| `url` | `text` not null | Link de onde o arquivo foi baixado. |
| `sha256` | `char(64)` not null | Hash do arquivo, usado para auditoria. |
| `status` | `text` not null default `'em_andamento'` | `check (status in ('em_andamento','concluida','fora_da_janela'))`. |
| `processada_em` | `timestamptz` null | Preenchido quando a edição é concluída. |
| `contagens` | `jsonb` null | Preenchido na conclusão: `{ linhas, na_regiao, gravadas, ja_existentes, rejeitadas, sem_posto, motivos: {…} }` |

**Uso**:
- O `sync-precos` ignora as URLs que já estão em `links_lpc`. Um arquivo cujo `PERÍODO` já foi
  concluído, como o mesmo período republicado com outro nome, é baixado uma vez, reconhecido
  como já processado e tem a URL registrada, para não ser baixado de novo.
- **Janela de 12 meses**: só entram os links de `arquivos-lpc/<ano>/` a partir do ano em que a
  janela começa, do ano mais novo para o mais antigo (`selecionarLinksPendentes`). Um arquivo
  cujo `PERÍODO` termina antes da janela é registrado como `fora_da_janela`, sem preços, só para
  não ser baixado de novo. Assim, os arquivos antigos da página, que vão até 2022, não tomam as
  3 vagas por execução da edição nova (SC-005).
- A edição nasce `em_andamento`, antes de gravar os preços, porque `precos.edicao_id` aponta para
  ela. Ela só passa a `concluida` depois que todos os lotes foram gravados.
- Uma edição que ficou `em_andamento`, porque a execução foi interrompida, é retomada na próxima
  execução. Como o upsert ignora duplicatas, retomar não duplica nada (FR-022). A função pura
  `decidirEdicao` (`_shared/lote-precos.ts`) decide entre nova, retomar, fora da janela e já
  processada.

### `links_lpc`: URLs do LPC que já tiveram desfecho (não é público)

| Campo | Tipo | Regras |
|---|---|---|
| `url` | `text` PK | URL do arquivo, como aparece na página do LPC. |
| `edicao_id` | `bigint` not null | FK para `edicoes_lpc(id)`: a edição a que o arquivo corresponde. |
| `resultado` | `text` not null | `check (resultado in ('concluida','ja_processada','fora_da_janela'))`. |
| `visto_em` | `timestamptz` not null default `now()` | |

**Uso**:
- Toda URL baixada é registrada quando tem um desfecho final: edição concluída, período já
  processado (o mesmo período com outro nome) ou fora da janela. A seleção de links pendentes
  descarta essas URLs, então um link repetido não ocupa as 3 vagas por execução (SC-005) e a
  segunda execução seguida devolve `edicoes: []` (SC-006).
- Uma edição interrompida (`em_andamento`) não registra a URL, e por isso volta na próxima
  execução (FR-022).

### `execucoes_sync`: registro interno de execuções (não é público)

| Campo | Tipo | Regras |
|---|---|---|
| `id` | `bigint` identity PK | |
| `fonte` | `text` not null | `'cadastro'` ou `'precos'`. |
| `iniciada_em` / `terminada_em` | `timestamptz` | |
| `resultado` | `text` not null | `'ok'` ou `'falha'`. |
| `detalhe` | `text` null | Mensagem técnica do erro. Nunca contém segredos nem dados de usuários. |
| `contagens` | `jsonb` null | Mesmo formato do campo de `edicoes_lpc`, mais `localizacao_invalida` e `desativados` no cadastro. |

### `estado_fontes`: situação de cada fonte (leitura pública; alimenta o aviso do FR-027)

| Campo | Tipo | Regras |
|---|---|---|
| `fonte` | `text` PK | `'cadastro'` ou `'precos'`. |
| `ultima_ok_em` | `timestamptz` null | Última execução bem-sucedida. |
| `ultima_edicao_fim` | `date` null | Só para `precos`: o `periodo_fim` mais recente já incorporado. |
| `em_problema` | `boolean` not null default `false` | |
| `tipo_problema` | `text` null | `'falha'` ou `'atraso'`. |
| `problema_desde` | `timestamptz` null | Quando o problema em aberto começou. |

**Transição** (função pura `transicaoEstado`, ver R15):

```text
ok ──(falha, ou atraso)──► problema         [em_problema, tipo_problema e problema_desde = agora]
problema ──(continua com problema)──► problema   [mantém problema_desde; atualiza o tipo, se mudou]
problema ──(execução ok e sem atraso)──► ok      [limpa os campos de problema; o aviso some]
```

Não há notificação ativa (R15). O mantenedor acompanha as fontes pelo mesmo aviso público.

Cada execução de um `sync-*` avalia **as duas fontes**. Assim, se o agendamento de uma delas
parar, a outra detecta o atraso. Para o cadastro, conta como problema também ficar mais de 8 dias
sem execução bem-sucedida.

## Segurança (RLS, Princípio II)

| Tabela | RLS | Política para `anon`/`authenticated` |
|---|---|---|
| `postos` | habilitada | `select` |
| `precos` | habilitada | `select` |
| `estado_fontes` | habilitada | `select` |
| `edicoes_lpc` | habilitada | nenhuma, ou seja, inacessível |
| `links_lpc` | habilitada | nenhuma, ou seja, inacessível |
| `execucoes_sync` | habilitada | nenhuma, ou seja, inacessível |

As escritas são feitas só pela service role, dentro das Edge Functions e do script de carga. Os
RPCs são `security invoker` e só leem tabelas com `select` público.

## Dados estáticos do front

### `MunicipioRMR` (`features/busca/data/municipios-rmr.ts`)

| Campo | Tipo | Observação |
|---|---|---|
| `codigoIbge` | `string` | Código de 7 dígitos. |
| `nome` | `string` | Com acento, para exibição (ex.: "Jaboatão dos Guararapes"). |
| `nomeNormalizado` | `string` | Usado na busca e na comparação com as fontes (`JABOATAO DOS GUARARAPES`). |
| `limites` | `[oeste, sul, leste, norte]` | Retângulo do município, extraído uma vez da malha do IBGE, usado para centralizar o mapa. |

A constante `REGIAO_PADRAO` é a união dos 15 retângulos. Ela é o enquadramento inicial do mapa
(FR-002) e serve para detectar "fora da região" (FR-005).

## Tipos de domínio (front)

Todos são tipados e, quando há regra, calculados por funções puras em `features/*/domain` e
`lib/formato`. Os testes são escritos antes (Princípio V).

- **`PostoNoMapa`**: `{ cnpj, nome, bandeira, municipio, lat, lng, coletaAtual?: Coleta,
  coletaAnterior?: Coleta }`. Vem do RPC `postos_na_area`.
- **`Coleta`**: `{ data: DataISO /* 'AAAA-MM-DD' */, precoMilesimos: number /* inteiro: 6,59 ->
  6590 */, fonte: string }`. O preço circula como inteiro em milésimos, o que evita conta em
  ponto flutuante.
- **`IdadeColeta`**: `{ dias: number, unidade: 'dias'|'semanas'|'meses', valor: number, antiga:
  boolean /* dias > 28 */ }`. Calculada por `calcularIdade(dataColeta, hoje)`, com `hoje` no fuso
  America/Sao_Paulo e passado como argumento.
- **`Variacao`**: `{ diferencaMilesimos: number, percentual: number /* 1 casa */, desde: DataISO }`.
  Calculada por `calcularVariacao(atual, anterior)` só quando as duas coletas existem (FR-016).
- **`Reacao`**: `'subiu' | 'caiu' | 'estavel' | 'neutro'`. Calculada por
  `classificarReacao(atual?, anterior?)` (FR-018).
- **`GrupoLista`**: `'recente' | 'antiga' | 'sem_preco'`. A função
  `ordenarLista(postos, hoje, sentido)` aplica os grupos fixos do FR-011.
- **`BboxQuantizada`**: `[oeste, sul, leste, norte]` numa grade de 0,02°, produzida por
  `quantizarBbox(bboxVisivel)` (R13).
- **`StatusFontes`**: `{ aviso: null | { texto: string } }`. Calculado por
  `avaliarStatus(estadoFontes, hoje)` (FR-027). O texto já vem pronto, com a data mais antiga
  entre as fontes com problema, formatada por `lib/formato`.

## Regras de validação, por requisito

| Requisito | Regra | Onde |
|---|---|---|
| FR-023, Princípio I | Zod valida cada registro externo antes da gravação. Registro inválido é descartado e entra em `contagens.rejeitadas` com motivo. | `supabase/functions/_shared/schemas.ts` |
| FR-024 | Preço cujo CNPJ normalizado não existe em `postos` é gravado e contabilizado em `sem_posto`, e não sai no RPC. | `sync-precos` e RPC |
| FR-025 | Nenhum código preenche, interpola ou copia preço. As telas só exibem linhas reais de `precos`. | revisão e testes |
| FR-026 | Inativo sai do RPC do mapa, mas continua em `detalhe_posto` com `ativo: false`. | RPC |
| FR-028 | O preço é exibido com 2 casas, ou com 3 se a terceira não for zero. As datas são dd/mm/aaaa, sem converter `AAAA-MM-DD` com `new Date()`, que causaria deslocamento de fuso. | `lib/formato` |
