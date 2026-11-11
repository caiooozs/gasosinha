---

description: "Lista de tarefas da feature 001-gas-price-map (Gasosinha)"
---

# Tasks: Gasosinha — Mapa de Preços da Gasolina por Posto

**Input**: documentos de design em `specs/001-gas-price-map/`: [plan.md](./plan.md),
[spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md),
[contracts/](./contracts/) e [quickstart.md](./quickstart.md).

**Prerequisites**: plan.md, spec.md, research.md, data-model.md e contracts/, todos presentes.

**Tests**: **obrigatórios** para toda função que transforma dado, pelo Princípio V da
constituição ("ganha teste unitário antes da implementação"), e para os componentes principais,
como diz o plan.md. Cada teste é escrito **antes** do código e precisa ser visto **falhando**
antes da implementação.

**Organization**: as tarefas estão agrupadas por história de usuário, para que cada uma possa ser
implementada e testada de forma independente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo, porque mexe em arquivos diferentes e não depende de tarefa
  incompleta.
- **[Story]**: história de usuário da tarefa (US1, US2 ou US3).
- **🔒 Área sensível (Princípio IX)**: toda tarefa que cria ou altera arquivos em
  `supabase/migrations/`, em `supabase/functions/` (inclusive `_shared/`, testes e fixtures) ou
  em `scripts/backfill-precos.ts`. O diff passa por **revisão humana** antes de entrar.
- **🙋 Aprovação**: a tarefa executa algo no ambiente remoto (`db push`, `functions deploy`, carga
  em produção, simulação de falha em produção ou deploy na Vercel). O agente prepara o comando,
  e **a pessoa autoriza** antes de rodar.

## Convenções que valem para todas as tarefas

- **Caminhos**: relativos à raiz do repositório. O alias `@/*` aponta para `./*`.
- **Documentação do Next**: antes de escrever código que depende do Next.js, leia o guia
  correspondente em `node_modules/next/dist/docs/`, como pede o `AGENTS.md`. Os guias citados
  pelas tarefas estão no texto de cada uma.
- **Tipos**: TypeScript `strict`, sem `any`. Exceção só com comentário de justificativa.
- **Camadas MVVM (Princípio IV)**:
  - views (`app/`, `components/`) só renderizam e repassam eventos, e nunca importam
    `features/*/services`;
  - viewmodels (`features/*/viewmodels`) são hooks com TanStack Query, ou funções de servidor em
    `*.server.ts`;
  - regras puras ficam em `features/*/domain` e `supabase/functions/_shared`;
  - acesso a dados fica em `features/*/services`.
- **Testes**: ficam ao lado do arquivo testado (`*.test.ts` ou `*.test.tsx`). As datas de "hoje"
  são sempre parâmetro, nunca `Date.now()` dentro do domínio. Nos textos esperados, o espaço
  depois de `R$` é o espaço não separável (U+00A0) que o `formatarPreco` produz.
- **Formatação (Princípio VIII)**: toda formatação de moeda, data, idade, percentual e variação
  sai de `lib/formato`, o módulo único. Só o front formata valores para exibição. Uma data
  `AAAA-MM-DD` nunca é convertida com `new Date('AAAA-MM-DD')`.
- **`supabase/functions/_shared/`**: todo import relativo leva a extensão `.ts`, que o Deno exige,
  e nenhum arquivo importa de fora de `supabase/functions/`.
- **Migrations**: toda migration nova recebe um timestamp maior que o da última já aplicada no
  remoto. Senão, o `supabase db push` a recusa.
- **Quality Gates**: nenhum commit sem `npm run typecheck`, `npm run lint` e `npm test`
  passando. Um teste e a implementação que o faz passar formam um grupo lógico, e o commit vem
  depois dos dois. Cada checkpoint repete os três.
- **Hora atual**: nenhum componente ou viewmodel cliente chama `new Date()` durante o render,
  porque, com Cache Components, o Next também pré-renderiza Client Components e ler a hora ali
  quebra o build. O "hoje" vem de `hojeParaRender()` (servidor, `'use cache'` com
  `cacheLife('hours')`) e passa por `useHoje(hojeServidor)`: no pré-render e na hidratação vale
  o valor do servidor, e depois vale `hojeEmSaoPaulo(new Date())` do navegador.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: dependências, configuração de testes, scaffolding do Supabase e fixtures reais.

- [X] T001 Instalar as dependências de runtime em `package.json`:
  - `@supabase/supabase-js@^2`;
  - `@tanstack/react-query@^5`, na versão 5.40.0 ou mais recente, porque a hidratação de queries
    pendentes depende dela;
  - `maplibre-gl`, `react-map-gl`, `supercluster`, `zod@^4` e `fflate`. O Zod precisa estar na
    4.6.6 ou mais recente, porque as versões anteriores, inclusive toda a linha 3, têm o alerta
    GHSA-mrhx-c7xc-m3w5 (consumo excessivo de memória).

  Rode `npm install` e confirme que `package-lock.json` foi atualizado.
- [X] T002 Instalar as dependências de desenvolvimento em `package.json`: `vitest`, `jsdom`,
  `@testing-library/react`, `@testing-library/dom` (peer obrigatório do anterior),
  `@testing-library/user-event`, `@types/supercluster` e `tsx`. Alinhar `@types/node` a `^24`,
  porque o projeto roda em Node 24 e o Vitest 5 recusa `^20`. Criar os scripts:
  - `"typecheck": "tsc --noEmit"`;
  - `"test": "vitest run"`;
  - `"test:watch": "vitest"`.
- [X] T003 [P] Criar `vitest.config.mts` e `vitest.setup.ts`, depois de ler `node_modules/next/dist/docs/01-app/02-guides/testing/`.
  A extensão `.mts` segue o guia do Next, porque o `package.json` não declara `"type": "module"`.
  - **include**: `features/**/*.test.{ts,tsx}`, `lib/**/*.test.ts`, `components/**/*.test.tsx` e
    `supabase/functions/_shared/**/*.test.ts`;
  - **ambiente**: `node` para `*.test.ts` e `jsdom` para `*.test.tsx`, separados em
    `test.projects`, porque o Vitest 5 não tem mais `environmentMatchGlobs`;
  - **alias**: `@/` → raiz;
  - **JSX**: `oxc: { jsx: { runtime: 'automatic' } }`, porque no Vite 8 a opção `esbuild` está
    obsoleta;
  - **`vitest.setup.ts`**: chama o `cleanup` do Testing Library depois de cada teste de componente,
    porque sem `globals: true` ele não roda sozinho;
  - **`passWithNoTests`**: `npm test` não falha enquanto não houver arquivos de teste.
- [X] T004 [P] Inicializar o shadcn/ui (`components.json`, `components/ui/`) com `npx shadcn@latest init -t next -b radix -p nova`, usando os tokens em CSS do
  Tailwind 4, e adicionar os componentes `button`, `sheet`, `command`, `tabs` e `toggle-group`.
  São gerados `components.json`, `components/ui/*` e `lib/utils.ts`. Ajustar os tokens de cor
  em `app/globals.css` para que o texto principal sobre o fundo tenha contraste de pelo menos
  4,5:1 (Princípio VII). Os valores medidos ficam num comentário no próprio `globals.css`.
- [X] T005 [P] Ajustar `tsconfig.json` e `eslint.config.mjs` para o type-check e o lint da raiz (R10):
  - em `tsconfig.json`, acrescentar `"supabase/functions/sync-*"` ao `exclude` e ligar
    `"allowImportingTsExtensions": true`, para o `tsc` aceitar os imports `./arquivo.ts` que o
    Deno exige dentro de `_shared` (o `noEmit` já está ligado);
  - em `eslint.config.mjs`, acrescentar `"supabase/functions/sync-*/**"` ao `globalIgnores`.

  O diretório `supabase/functions/_shared` **continua** no type-check.
- [X] T006 [P] Criar `.env.example` e ajustar `.gitignore`. O `.env.example` traz só os nomes das variáveis, sem valores:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `NEXT_PUBLIC_SITE_URL`;
  - `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`, só para o script de carga local, com um
    comentário avisando que nunca podem ter o prefixo `NEXT_PUBLIC_`.

  Acrescentar `!.env.example` ao `.gitignore`, logo depois da linha `.env*`.
- [X] T007 [P] 🔒 Rodar `npx supabase init` para criar `supabase/config.toml`. Criar
  `supabase/functions/deno.json` com o import map `{"imports": {"zod": "npm:zod@^4.6.7", "fflate":
  "npm:fflate@<versão do package.json>", "@supabase/supabase-js": "npm:@supabase/supabase-js@2"}}`.
  Assim, os imports sem prefixo funcionam igual em Deno e em Node (R10).
- [X] T008 [P] Criar `scripts/gerar-sprites-provisorios.mjs`, usando apenas `node:zlib` e
  `node:fs` para escrever PNG. Ele gera quatro sprite sheets provisórios em `public/gasosinha/`:
  `subiu.png`, `caiu.png`, `estavel.png` e `neutro.png`.
  - Cada arquivo tem 4 quadros de 32×32 px lado a lado (128×32).
  - Cada reação tem uma silhueta e um símbolo diferentes (seta para cima, seta para baixo,
    traço, círculo), para não depender só de cor.

  Rode o script e versione os PNGs. A arte final é insumo externo e substitui estes arquivos com
  as mesmas dimensões.
- [X] T009 🔒 Criar `scripts/fixtures/recortar-fontes-anp.ts`, que roda com `npx tsx` e depende de
  T001 e T002. Ele baixa as fontes reais e grava recortes em
  `supabase/functions/_shared/fixtures/`:
  - **`revendedores-pe-amostra.json`**: o envelope completo da API com cerca de 12 registros.
    Precisa incluir:
    - o CNPJ `05648920000134`, que vem sem coordenada;
    - pelo menos um registro com `estimativaAcuracia` vazia;
    - registros de 3 municípios da RMR e 2 de fora da RMR.
  - **`lpc-amostra.xlsx`**: XLSX válido, reempacotado com `fflate.zipSync`, a partir de
    `revendas_lpc_2026_10_18-2026_10_24.xlsx`. Mantém as 7 linhas de metadados, o cabeçalho e
    cerca de 40 linhas de dados. Precisa incluir:
    - linhas de PE da RMR com `GASOLINA COMUM`, com CNPJs de 12 e de 13 dígitos;
    - um preço com artefato de float, como `6.4899999999999993`. Nessa semana, nenhuma linha
      de gasolina comum da RMR tem artefato; a fixture leva dois preços reais de outros estados,
      e o `manifesto.json` explica como o T017 monta o caso;
    - `GASOLINA ADITIVADA`;
    - outros estados.
  - **`lpc-pagina-amostra.html`**: trecho do HTML da página "últimas semanas pesquisadas" com
    pelo menos 6 links `revendas*`, incluindo os formatos irregulares `revendas_lpc-1.xlsx` e
    `revendas_lpc_2026_10_18-2026_10_24.xlsx`.

  Rode o script e versione as fixtures.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: banco, domínio e infraestrutura de ingestão, Edge Functions e base do front. Sem
isso, nenhuma história tem dados para mostrar.

**⚠️ CRITICAL**: nenhuma história de usuário pode começar antes desta fase terminar.

### Banco 🔒

- [X] T010 🔒 Criar `supabase/migrations/20261028120000_tabelas.sql` com
  `create extension if not exists postgis with schema extensions` e as tabelas abaixo, copiando
  as restrições do [data-model.md](./data-model.md).

  **`postos`**:
  - `cnpj char(14) primary key check (cnpj ~ '^\d{14}$')`;
  - `razao_social text not null`, `bandeira text null`, `endereco text not null`,
    `bairro text null`, `cep char(8) null`, `municipio text not null`, `uf char(2) not null`;
  - `localizacao extensions.geography(Point, 4326) null`;
  - `lat double precision generated always as
    (extensions.st_y(localizacao::extensions.geometry)) stored` e `lng`, igual com `st_x`, para
    ler as coordenadas sem decodificar o tipo geográfico (sync e RPCs);
  - `acuracia_estimada text null`, `origem_localizacao text null`;
  - `ativo boolean not null default true`, `desativado_em timestamptz null`,
    `atualizado_em timestamptz not null`;
  - índice GiST em `localizacao` e índice parcial `on postos (ativo) where ativo`.

  **`edicoes_lpc`**:
  - `id bigint generated always as identity primary key`;
  - `periodo_inicio date not null`, `periodo_fim date not null`,
    `unique (periodo_inicio, periodo_fim)`;
  - `url text not null`, `sha256 char(64) not null`;
  - `status text not null default 'em_andamento' check (status in
    ('em_andamento','concluida','fora_da_janela'))`;
  - `processada_em timestamptz null` e `contagens jsonb null`, preenchidos na conclusão.

  **`links_lpc`** (interna; toda URL que já teve um desfecho final):
  - `url text primary key`;
  - `edicao_id bigint not null references edicoes_lpc(id)`;
  - `resultado text not null check (resultado in
    ('concluida','ja_processada','fora_da_janela'))`;
  - `visto_em timestamptz not null default now()`.

  **`precos`**:
  - `cnpj char(14) not null`, **sem chave estrangeira para `postos`**;
  - `produto text not null check (produto = 'gasolina_comum')`;
  - `data_coleta date not null`;
  - `preco numeric(6,3) not null check (preco > 0 and preco < 50)`;
  - `fonte text not null`;
  - `edicao_id bigint not null references edicoes_lpc(id)`;
  - `criado_em timestamptz not null default now()`;
  - `unique (cnpj, produto, data_coleta)`.

  **`execucoes_sync`**:
  - `id bigint generated always as identity primary key`;
  - `fonte text not null check (fonte in ('cadastro','precos'))`;
  - `iniciada_em timestamptz not null`, `terminada_em timestamptz null`;
  - `resultado text not null check (resultado in ('ok','falha'))`;
  - `detalhe text null`, `contagens jsonb null`.

  **`estado_fontes`**:
  - `fonte text primary key check (fonte in ('cadastro','precos'))`;
  - `ultima_ok_em timestamptz null`, `ultima_edicao_fim date null`;
  - `em_problema boolean not null default false`;
  - `tipo_problema text null check (tipo_problema in ('falha','atraso'))`;
  - `problema_desde timestamptz null`;
  - semente: `insert` das linhas `('cadastro')` e `('precos')`.
- [X] T011 🔒 Criar `supabase/migrations/20261028120100_rls.sql`:
  - `alter table … enable row level security` nas 6 tabelas;
  - políticas `for select to anon, authenticated using (true)` **somente** em `postos`, `precos`
    e `estado_fontes`;
  - **nenhuma** política em `edicoes_lpc`, `links_lpc` e `execucoes_sync`.

  Não criar políticas de `insert`, `update` ou `delete` para `anon` nem `authenticated`. A
  escrita acontece só pela service role (Princípio II).

### Domínio da ingestão: testes primeiro (devem falhar)

- [X] T012 [P] 🔒 Escrever `supabase/functions/_shared/cnpj.test.ts` para `normalizarCnpj(bruto:
  string | number): string | null`. Casos:
  - máscara `" 01.492.748/0003-83"` → `"01492748000383"`;
  - número `8220930000162` → `"08220930000162"`;
  - string de 12 dígitos completada com zeros;
  - `"11694577000167"` aceito;
  - dígitos verificadores inválidos → `null`;
  - mais de 14 dígitos → `null`;
  - vazio → `null`.
- [X] T013 [P] 🔒 Escrever `supabase/functions/_shared/preco.test.ts` para
  `canonicalizarPreco(bruto: string | number)`, que devolve
  `{ ok: true, valor: string /* '6.490' */, milesimos: number } | { ok: false, motivo:
  'preco_invalido' }`. Casos:
  - `'7.19'` → 7190;
  - `'6.5'` → 6500;
  - `'6.4899999999999993'` → 6490, porque a diferença é menor que 1e-9;
  - `'6.4891'` → rejeita, porque não é artefato de float;
  - `'100'` → rejeita, porque 50 ou mais;
  - `'0'` → rejeita;
  - `'abc'` → rejeita.

  O teste deve comprovar que a conversão não passa por `parseFloat` para decidir o arredondamento.
- [X] T014 [P] 🔒 Escrever `supabase/functions/_shared/data-serial.test.ts` com:
  - `serialExcelParaIso(46314)` → `'2026-10-19'` (base 1899-12-30);
  - `dataBrParaIso('18/10/2026')` → `'2026-10-18'`;
  - entradas inválidas → `null`;
  - `dentroDoPeriodo('2026-10-19', {inicio: '2026-10-18', fim: '2026-10-24'})` → `true`;
  - `'2026-10-25'` → `false`;
  - `inicioDaJanela('2026-11-02', 12)` → `'2025-11-02'`;
  - `inicioDaJanela('2024-02-29', 12)` → `'2023-02-28'`, porque o dia é ajustado ao último dia
    do mês.
- [X] T015 [P] 🔒 Escrever `supabase/functions/_shared/regiao-rmr.test.ts` com:
  - `normalizarNomeMunicipio('Jaboatão dos Guararapes ')` → `'JABOATAO DOS GUARARAPES'`;
  - `ehMunicipioRmr('SAO LOURENCO DA MATA')` → `true` e `ehMunicipioRmr('CARUARU')` → `false`;
  - a lista `MUNICIPIOS_RMR` tem exatamente 15 itens;
  - `dentroDaRmr(-8.06246, -34.91138)` → `true`, `dentroDaRmr(-9.4, -40.5)` → `false`, com
    margem de 0,05°.
- [X] T016 [P] 🔒 Escrever `supabase/functions/_shared/xlsx.test.ts` para `lerPlanilha(bytes:
  Uint8Array): Record<string, string | null>[]`, usando `fixtures/lpc-amostra.xlsx`:
  - devolve uma linha por `<row>`, indexada pela letra da coluna;
  - resolve `t="s"` por `sharedStrings` e lê `t="inlineStr"`;
  - célula ausente vira `null`;
  - o 5º item devolvido contém `"PERÍODO: 18/10/2026 A 24/10/2026"`. É a `<row r="6">`, porque o
    arquivo pula as linhas 4 e 9 da planilha;
  - o 8º item (`<row r="10">`) tem `A = "CNPJ"`;
  - a célula inlineStr e as linhas de cada caso estão em `fixtures/manifesto.json`.
- [X] T017 [P] 🔒 Escrever `supabase/functions/_shared/lpc.test.ts` para três funções.

  **`extrairLinksLpc(html)`**, com `fixtures/lpc-pagina-amostra.html`: devolve só as URLs
  absolutas que casam `/arquivos-lpc/\d{4}/revendas[^"]*\.xlsx$`, sem duplicatas.

  **`selecionarLinksPendentes(links, urlsVistas, anoMinimo, limite)`**, em que `urlsVistas` são
  as URLs de `links_lpc`, as que já tiveram um desfecho final:
  - descarta as URLs que estão em `urlsVistas`; uma edição interrompida não tem URL lá e por
    isso volta;
  - descarta os links de `arquivos-lpc/<ano>/` com ano menor que `anoMinimo`;
  - ordena pelo ano, do mais novo para o mais antigo, mantendo a ordem da página dentro do ano;
  - devolve no máximo `limite` links, e `Infinity` devolve todos.

  **`parseArquivoLpc(linhas)`**, que devolve `{ periodo: {inicio, fim}, validas: LinhaLpcValida[],
  rejeitadas: {motivo, linha}[], ignoradas: number }`. Casos:
  - encontra o `PERÍODO`;
  - encontra o cabeçalho pela coluna A = `CNPJ` e lê as colunas **pelo nome**;
  - mantém só `ESTADO = PERNAMBUCO`, município da RMR e `PRODUTO = GASOLINA COMUM`; as demais
    linhas contam em `ignoradas`;
  - completa o CNPJ de 13 dígitos;
  - canonicaliza o preço com artefato de float;
  - rejeita `unidade_inesperada`, `data_fora_do_periodo`, `cnpj_invalido` e `preco_invalido`;
  - mesmo `(cnpj, data)` com preços diferentes rejeita as duas linhas como
    `conflito_mesma_data`;
  - mesmo `(cnpj, data)` com o mesmo preço vira uma linha só;
  - coluna obrigatória ausente ou `PERÍODO` ausente → lança `FormatoInesperadoError`.
- [X] T018 [P] 🔒 Escrever `supabase/functions/_shared/revendedores.test.ts` para
  `parseEnvelopeRevendedores(json)` e `parseRevendedor(registro)`, usando
  `fixtures/revendedores-pe-amostra.json`:
  - envelope sem `succeeded` → lança `FormatoInesperadoError`;
  - página além da última (sem `data`) → lista vazia com `totalPagina`;
  - registros fora da RMR → ignorados;
  - `05648920000134` → `localizacao: null` e `localizacaoInvalida: true`;
  - coordenada fora da RMR → `localizacao: null`;
  - `distribuidora` vazia → `bandeira: null`;
  - `endereco` e `complemento` unidos sem espaços duplicados;
  - CEP só com dígitos, e 8 dígitos ou `null`.
- [X] T019 [P] 🔒 Escrever `supabase/functions/_shared/alerta.test.ts`.

  **`avaliarFonte(estado, agora)`** devolve `{ problema: null | 'falha' | 'atraso' }`. Casos:
  - para `precos`, `ultima_edicao_fim` com mais de 14 dias → `'atraso'`;
  - para `cadastro`, `ultima_ok_em` com mais de 8 dias → `'atraso'` (FR-027);
  - a última execução falhou → `'falha'`.

  **`transicaoEstado(anterior, avaliacao, agora)`** devolve o novo estado da fonte, que liga e
  desliga o aviso do site (FR-027). Não há notificação ativa (R15). Casos:
  - ok → problema: `em_problema`, `tipo_problema` e `problema_desde = agora`;
  - problema → problema: mantém `problema_desde` e atualiza o `tipo_problema`, se mudou;
  - problema → ok: limpa `em_problema`, `tipo_problema` e `problema_desde`;
  - ok → ok: nada muda.
- [X] T020 [P] 🔒 Escrever `supabase/functions/_shared/lote-precos.test.ts`.

  **`classificarLote(validas, existentes, cnpjsCadastrados)`** devolve `{ novas, jaExistentes:
  number, conflitos: {linha, motivo: 'conflito_com_existente'}[], semPosto: number }`. Casos:
  - chave nova com CNPJ cadastrado → entra em `novas`;
  - mesma chave e mesmo preço já gravados → conta em `jaExistentes` e fica fora de `novas`;
  - mesma chave com preço diferente → `conflito_com_existente`, e o valor gravado é mantido;
  - CNPJ ausente de `postos` → entra em `novas` (fica guardado, FR-024) e conta em `semPosto`;
  - o preço é comparado por `precoMilesimos`, nunca por float.

  **`decidirEdicao({ existente, periodo, janelaDesde })`**, nesta ordem de prioridade:
  - `existente` `concluida` ou `fora_da_janela` → `'ja_processada'`;
  - `periodo.fim` anterior a `janelaDesde` → `'fora_da_janela'`;
  - `existente` `em_andamento` → `'retomar'`;
  - sem `existente`, dentro da janela → `'nova'`.
- [X] T021 [P] 🔒 Escrever `supabase/functions/_shared/retrato-postos.test.ts` para
  `planejarSincronizacaoPostos(gravados, recebidos)`, que devolve `{ valido, inserir, atualizar,
  inalterados, desativar, reativar }`. Casos:
  - posto novo → `inserir`;
  - posto igual ao gravado → `inalterados`, mesmo com a coordenada escrita de outro jeito
    (`-8.0624600` e `-8.06246`), comparada com 6 casas decimais;
  - endereço, bandeira ou coordenada diferente → `atualizar`;
  - ativo ausente do retrato → `desativar`;
  - inativo que voltou → `reativar`, com os dados recebidos, então uma mudança é gravada junto;
  - o retrato é válido quando contém pelo menos 80% dos ativos gravados, ou seja,
    `|recebidos ∩ ativos gravados| ≥ 0,8 × |ativos gravados|`;
  - retrato com menos de 80% dos ativos gravados → `valido: false` e todas as listas vazias;
  - retrato com 70% dos ativos mais postos novos, que juntos passam de 80% do total → inválido,
    porque os novos não contam para os 80%;
  - exatamente 80% → válido;
  - banco vazio (primeira carga) → válido, com tudo em `inserir`.

### Domínio da ingestão: implementação (até os testes acima passarem)

- [X] T022 [P] 🔒 Implementar `supabase/functions/_shared/regiao-rmr.ts` até o T015 passar:
  - `MUNICIPIOS_RMR` com os 15 municípios. Cada um tem `{ codigoIbge, nome (com acento),
    nomeNormalizado, limites: [oeste, sul, leste, norte] }`.
    - Os códigos vêm de
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/PE/municipios`.
    - Os limites vêm do retângulo envolvente da malha de cada município em
      `https://servicodados.ibge.gov.br/api/v3/malhas/municipios/{codigo}?formato=application/vnd.geo+json`.
    - Os dois são consultados uma vez e gravados como constantes.
  - `RMR_LIMITES`, a união dos 15 retângulos;
  - `normalizarNomeMunicipio`, `ehMunicipioRmr` e `dentroDaRmr(lat, lng, margem = 0.05)`.

  O módulo não pode usar APIs de Deno nem de Node.
- [X] T023 [P] 🔒 Implementar `supabase/functions/_shared/cnpj.ts` (`normalizarCnpj`, com cálculo
  dos dígitos verificadores) até o T012 passar.
- [X] T024 [P] 🔒 Implementar `supabase/functions/_shared/preco.ts` (`canonicalizarPreco`, com
  aritmética decimal sobre a string) até o T013 passar.
- [X] T025 [P] 🔒 Implementar `supabase/functions/_shared/data-serial.ts` (`serialExcelParaIso`,
  `dataBrParaIso`, `dentroDoPeriodo` e `inicioDaJanela`, com aritmética em UTC) até o T014
  passar.
- [X] T026 [P] 🔒 Implementar `supabase/functions/_shared/xlsx.ts` (`lerPlanilha`) até o T016
  passar. Usar `unzipSync` do `fflate` e, sobre `xl/worksheets/sheet1.xml` e
  `xl/sharedStrings.xml`, extração por expressões regulares de `<row>`, `<c r t>`, `<v>` e
  `<t>`, decodificando entidades XML.
  - **Não** usar SheetJS (R6).
  - Medir com o arquivo semanal real: deve ficar abaixo de 300 ms de CPU em Node. Registrar a
    medição como comentário no topo do arquivo.
- [X] T027 🔒 Implementar `supabase/functions/_shared/schemas.ts` com os schemas Zod
  `EnvelopeRevendedores`, `RevendedorAnp` e `LinhaLpc`, conforme
  [contracts/fontes-externas.md](./contracts/fontes-externas.md). Eles usam `normalizarCnpj`,
  `canonicalizarPreco` e `serialExcelParaIso` em `transform` e `refine`. Depende de T022 a
  T025.
- [X] T028 🔒 Implementar `supabase/functions/_shared/lpc.ts` (`extrairLinksLpc`,
  `selecionarLinksPendentes` e `parseArquivoLpc`, com `FormatoInesperadoError`) até o T017
  passar. Depende de T026 e T027.
- [X] T029 🔒 Implementar `supabase/functions/_shared/revendedores.ts` (`parseEnvelopeRevendedores`
  e `parseRevendedor`) até o T018 passar. Depende do T027.
- [X] T030 [P] 🔒 Implementar `supabase/functions/_shared/alerta.ts` (`avaliarFonte` e
  `transicaoEstado`) até o T019 passar.
- [X] T031 [P] 🔒 Implementar `supabase/functions/_shared/lote-precos.ts` (`classificarLote` e
  `decidirEdicao`) até o T020 passar.
- [X] T032 [P] 🔒 Implementar `supabase/functions/_shared/retrato-postos.ts`
  (`planejarSincronizacaoPostos`) até o T021 passar.

### Infraestrutura de ingestão e Edge Functions 🔒

- [X] T033 🔒 Implementar `supabase/functions/_shared/infra/execucao.ts`, que recebe o cliente e
  o ambiente por parâmetro, sem `Deno.env`. Depende do T030. O acesso ao Supabase fica no
  adaptador `supabase/functions/_shared/infra/banco.ts` (`BancoGasosinha`), com uma versão em memória
  para os testes da orquestração (`banco-em-memoria.ts`). Ele exporta:
  - `verificarSegredoCron(recebido, esperado)`, com comparação em tempo constante;
  - `registrarExecucao(cliente, {fonte, iniciada_em, resultado, detalhe, contagens})`, que
    insere em `execucoes_sync`;
  - `reavaliarFontes(cliente, agora)`: lê as duas linhas de `estado_fontes` e a última execução
    de cada fonte, aplica `avaliarFonte` e `transicaoEstado` e grava o novo estado, que liga e
    desliga o aviso do site (FR-027).
- [X] T034 🔒 Implementar `supabase/functions/_shared/infra/ingestao-precos.ts` com
  `ingerirArquivoLpc(cliente, bytes, url, janelaDesde)`. Depende de T027, T028 e T031.
  1. calcula o `sha256` com `crypto.subtle`;
  2. faz `lerPlanilha` e `parseArquivoLpc`;
  3. busca a edição do mesmo `(periodo_inicio, periodo_fim)` e aplica `decidirEdicao({
     existente, periodo, janelaDesde })`:
     - `'ja_processada'` → registra a URL em `links_lpc` como `'ja_processada'` e devolve
       `{ jaProcessada: true }`;
     - `'fora_da_janela'` → registra (ou atualiza) a edição com esse status, `processada_em` e
       `contagens: { linhas }`, sem gravar preço, registra a URL em `links_lpc` como
       `'fora_da_janela'` e devolve `{ foraDaJanela: true }`;
     - `'retomar'` → reaproveita o `id`;
     - `'nova'` → insere em `edicoes_lpc` com `status = 'em_andamento'` e `on conflict
       (periodo_inicio, periodo_fim) do nothing`. Se outra execução já criou a edição no mesmo
       instante, relê a linha e aplica `decidirEdicao` de novo. Assim, a carga do histórico e o
       cron podem rodar ao mesmo tempo sem gerar uma falha falsa;
  4. lê as coletas existentes para os CNPJs e datas do lote e os CNPJs de `postos`, e aplica
     `classificarLote`;
  5. faz upsert das `novas` em `precos` com `onConflict: 'cnpj,produto,data_coleta',
     ignoreDuplicates: true`, em lotes de 500, com `fonte = 'ANP – Levantamento de Preços de
     Combustíveis'`;
  6. só então marca a edição como `concluida`, com `processada_em` e `contagens`;
  7. registra a URL em `links_lpc` (upsert por `url`) com o `edicao_id` e `resultado =
     'concluida'`;
  8. devolve as contagens do [contrato](./contracts/edge-functions.md).

  Se a execução cair entre os passos 3 e 6, a edição fica `em_andamento`, a URL não entra em
  `links_lpc` e a edição é retomada na próxima execução (FR-022). Se cair entre os passos 6 e 7,
  a próxima execução baixa a URL de novo, recebe `'ja_processada'` e a registra. Os upserts em
  `precos` e em `links_lpc` e a conclusão da edição podem se repetir sem efeito. O script de
  carga (T081) também usa este módulo.
- [X] T035 🔒 Implementar `supabase/functions/sync-postos/index.ts` com `Deno.serve`, conforme
  [contracts/edge-functions.md](./contracts/edge-functions.md). Depende de T029, T032 e T033.
  A lógica fica em `supabase/functions/_shared/infra/sync-postos.ts`, testada no Vitest; o `index.ts`
  só lê o ambiente e cria o cliente.
  - **requisição**: método diferente de POST → 405; `x-cron-secret` inválido → 401;
  - **leitura**: `GET` em `REVENDEDORES_API_URL` (padrão
    `https://revendedoresapi.anp.gov.br/v1/combustivel`) com `uf=PE` e `numeropagina` até
    `totalPagina`, com `User-Agent: Gasosinha/1.0 (+<SITE_URL>)`, ou `Gasosinha/1.0` sem
    `SITE_URL`;
  - **planejamento**: `parseRevendedor` em cada registro, leitura dos postos gravados (com `lat`
    e `lng` das colunas geradas) e `planejarSincronizacaoPostos(gravados, recebidos)`;
  - **gravação**: só se o plano for válido. Insere `inserir`, atualiza `atualizar` e `reativar`
    (`ativo = true`, `desativado_em = null`) e desativa `desativar` (`ativo = false`,
    `desativado_em = now`), sempre com `atualizado_em = now` só nessas linhas, e
    `localizacao = 'SRID=4326;POINT(lng lat)'`. **Nada** é escrito nos `inalterados`, então
    rodar de novo sem mudança na fonte não altera registros (SC-006);
  - **retrato incompleto**: plano inválido → 422 com `retrato_incompleto`, e nada é desativado;
  - **contagens**: `inseridos`, `atualizados`, `inalterados`, `desativados`, `reativados` e
    `localizacao_invalida`;
  - **fim**: `registrarExecucao` e `reavaliarFontes` em qualquer desfecho; atualiza
    `estado_fontes.cadastro.ultima_ok_em` quando dá certo;
  - **erros**: fonte fora do ar → 502; `FormatoInesperadoError` → 422.
- [X] T036 🔒 Implementar `supabase/functions/sync-precos/index.ts` com `Deno.serve`, conforme o
  contrato. Depende de T028, T033 e T034. A lógica fica em
  `supabase/functions/_shared/infra/sync-precos.ts`, testada no Vitest.
  - **requisição**: 405 e 401 como no T035;
  - **descoberta**: calcula `janelaDesde = inicioDaJanela(hoje, 12)`, busca `LPC_PAGINA_URL`
    (padrão: a página "últimas semanas pesquisadas" do [research.md](./research.md) R3), aplica
    `extrairLinksLpc` e `selecionarLinksPendentes(links, urlsVistas, ano(janelaDesde), 3)`,
    com `urlsVistas` lidas de `links_lpc`. Assim, entram só os anos a partir do início da janela, do mais novo
    para o mais antigo, e os arquivos antigos não tomam as vagas da edição nova (SC-005);
  - **ingestão**: `ingerirArquivoLpc(cliente, bytes, url, janelaDesde)` em cada uma, atualizando
    `estado_fontes.precos` com
    `ultima_ok_em` e `ultima_edicao_fim = max(periodo_fim)` das edições concluídas;
  - **resposta**: `{ ok, fonte: 'precos', edicoes: [...], pendentes }`;
  - **fim**: `registrarExecucao` e `reavaliarFontes` sempre;
  - **erros**: 502 e 422 conforme o contrato. Uma edição com `FormatoInesperadoError` **não** é
    registrada em `edicoes_lpc`.
- [X] T037 🔒 Criar `supabase/migrations/20261028120200_cron.sql`:
  - `create extension if not exists pg_cron` e `pg_net`;
  - `cron.schedule('sync-precos-diario', '0 12 * * *', …)` e
    `cron.schedule('sync-postos-semanal', '0 9 * * 1', …)`;
  - cada um chama `net.http_post`, lendo `url` e `x-cron-secret` de `vault.decrypted_secrets`
    (nomes `sync_precos_url`, `sync_postos_url` e `cron_secret`), com
    `timeout_milliseconds := 120000`;
  - nenhum segredo aparece no arquivo;
  - no topo, um comentário avisa que os 3 segredos do Vault precisam existir antes de aplicar a
    migration.
- [X] T038 🙋 Executar `specs/001-gas-price-map/quickstart.md`, seções 2, 3 e 5, com aprovação
  humana depois da revisão do diff de todas as tarefas 🔒 das fases 1 e 2 (T007 e T009 a T037),
  nesta ordem:
  1. `npx supabase link`;
  2. criar no SQL Editor os 3 segredos do Vault (`sync_precos_url`, `sync_postos_url` e
     `cron_secret`), com os valores digitados pela pessoa, fora do repositório;
  3. `npx supabase secrets set CRON_SECRET=…`, com `CRON_SECRET` igual a `cron_secret`. A
     pessoa roda o comando no próprio terminal, para o valor não passar pela conversa;
  4. `npx supabase db push --remote`, que aplica as migrations `120000`, `120100` e `120200`;
  5. `npx supabase functions deploy sync-postos --no-verify-jwt --use-api --import-map
     supabase/functions/deno.json` e o mesmo para `sync-precos`;
  6. invocar as duas com `curl.exe`, e o `sync-postos` uma segunda vez.

  **Esperado**: `na_regiao` perto de 403, `localizacao_invalida` perto de 1, `inseridos: 0` e
  `atualizados: 0` na segunda chamada do `sync-postos`, e o `sync-precos` sem erro, com até 3
  edições do ano mais recente em `edicoes_lpc`. As 12 semanas completas chegam com a carga do
  T082. Depois, gerar os tipos em `lib/supabase/tipos.ts` com
  `npx supabase gen types --remote --lang typescript > lib/supabase/tipos.ts`.

### Base do front

- [X] T039 [P] Escrever `lib/formato/formato.test.ts`, o teste do módulo único de formatação
  (Princípio VIII).

  **Moeda**:
  - `formatarPreco(6590)` → `'R$ 6,59'`;
  - `formatarPreco(6599)` → `'R$ 6,599'`;
  - `formatarPreco(7000)` → `'R$ 7,00'`.

  **Data**:
  - `formatarData('2026-10-20')` → `'20/10/2026'`, sem usar `new Date`;
  - `hojeEmSaoPaulo(new Date('2026-10-28T02:30:00Z'))` → `'2026-10-27'`;
  - `diasEntre('2026-09-22', '2026-10-27')` → `35`.

  **Idade** (`formatarIdade({unidade, valor}, curta)`):
  - `{dias, 7}` → `'há 7 dias'` / `'há 7 d'`;
  - `{dias, 1}` → `'há 1 dia'`;
  - `{semanas, 5}` → `'há 5 semanas'` / `'há 5 sem'`;
  - `{meses, 4}` → `'há 4 meses'` nas duas formas;
  - `{dias, 0}` → `'hoje'`.

  **Percentual** (`formatarPercentual(p)`):
  - `1.5` → `'+1,5%'`;
  - `-3` → `'−3,0%'`, com o sinal de menos U+2212;
  - `0` → `'0,0%'`.

  **Variação** (`formatarVariacao(v)`):
  - `{100, 1.5, '2026-10-13'}` → `'+R$ 0,10 (+1,5%) desde 13/10/2026'`;
  - `{-200, -3.0, …}` → `'−R$ 0,20 (−3,0%) desde …'`, com o sinal de menos U+2212;
  - zero → `'R$ 0,00 (0,0%) desde …'`.
- [X] T040 [P] Implementar `lib/formato/formato.ts` e `lib/formato/index.ts` até o T039 passar.

  **`lib/formato/formato.ts`**, o único módulo de formatação do projeto (Princípio VIII):
  - `formatarPreco` usa `Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'})`,
    com 3 casas só quando `milesimos % 10 !== 0`;
  - `formatarData` e `diasEntre` trabalham sobre a string `AAAA-MM-DD`, com aritmética em UTC;
  - `hojeEmSaoPaulo` usa `Intl.DateTimeFormat('en-CA', {timeZone: 'America/Sao_Paulo'})`;
  - `formatarIdade`, `formatarPercentual` e `formatarVariacao`, esta última composta de
    `formatarPreco` (valor absoluto), `formatarPercentual` e `formatarData`, com `+` para alta,
    `−` (U+2212) para queda e nenhum sinal para zero.

  **`lib/formato/index.ts`**: reexporta `formato.ts`, para os imports ficarem `@/lib/formato`.
  Nenhum outro arquivo formata moeda, data, idade, percentual ou variação.
- [X] T041 [P] Criar `lib/supabase/cliente-navegador.ts` e `lib/supabase/cliente-servidor.ts`,
  depois de ler `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`.
  Depende do T038, por causa dos tipos gerados.
  - os dois usam `createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } })`, tipados com `lib/supabase/tipos.ts`;
  - o do servidor importa `'server-only'`;
  - se uma variável faltar, lançam um erro claro no carregamento do módulo;
  - nenhum dos dois usa a service role.
- [X] T042 Criar o shell do app em `app/providers.tsx`, `app/layout.tsx` e `components/avisos/AtribuicaoFontes.tsx`, depois de ler o guia de TanStack Query
  (`node_modules/next/dist/docs/01-app/02-guides/client-side-data-fetching/tanstack-query.md`).
  Depende do T004.
  - **`app/providers.tsx`**: `'use client'`, com `QueryClientProvider` e um `QueryClient` por
    render no servidor e reaproveitado no navegador, como no guia; `defaultOptions.queries.staleTime
    = 3_600_000`;
  - **`app/layout.tsx`**: `<html lang="pt-BR">`, `metadata` com `title: 'Gasosinha'`, uma
    `description` em pt-BR e `metadataBase` vindo de `NEXT_PUBLIC_SITE_URL`; envolve o
    conteúdo em `<Providers>`; importa `maplibre-gl/dist/maplibre-gl.css`;
  - **`components/avisos/AtribuicaoFontes.tsx`**: texto fixo e sempre visível, "Preços: ANP –
    Levantamento de Preços de Combustíveis · Mapa: © OpenStreetMap, OpenFreeMap" (FR-030).

**Checkpoint**: banco com postos e preços recentes, ingestão agendada, formatação e clientes
prontos. Antes de seguir, `npm run typecheck`, `npm run lint` e `npm test` passam. As histórias
podem começar.

---

## Phase 3: User Story 1 — Ver os postos da região no mapa (Priority: P1) 🎯 MVP

**Goal**: mapa da RMR com todos os postos autorizados, preço e idade da coleta (ou "sem preço")
em marcadores acessíveis e agrupados. Inclui também:
- uma lista ordenada da área visível, com preço, data, idade, fonte e variação;
- a busca de cidade;
- o botão "usar minha localização";
- o aviso de fonte com problema;
- os estados de carregamento e de erro.

**Independent Test**: com os dados da Fase 2 carregados, abrir `/`, mover o mapa, buscar
"jaboatao", usar a lista e o botão de localização. Conferir os cenários "Mapa inicial",
"Marcador com preço", "Sem preço", "Localização", "Busca", "Lista" e "Falha ao carregar" do
quickstart, seção 6. Não depende do detalhe nem do mascote.

### Tests for User Story 1 (escrever primeiro; devem falhar) ⚠️

- [X] T043 [P] [US1] Escrever `features/postos/domain/idade.test.ts` para
  `calcularIdade(dataColeta: string, hoje: string): IdadeColeta`. Casos:
  - 0 dia → `dias, 0`;
  - 7 dias → `{unidade: 'dias', valor: 7, antiga: false}`;
  - 13 dias → dias;
  - 14 dias → `{semanas, 2}`;
  - 28 dias → `antiga: false`;
  - 29 dias → `antiga: true`;
  - 35 dias → `{semanas, 5}`;
  - 84 dias → `{semanas, 12}`;
  - 85 dias → `{meses, 2}`, com meses = `floor(dias/30)`;
  - 22/09/2026 a 27/10/2026 → 5 semanas e `antiga: true`.
- [X] T044 [P] [US1] Escrever `features/postos/domain/ordenar-lista.test.ts` para
  `ordenarLista(postos, hoje, sentido: 'asc' | 'desc')`. Casos:
  - os grupos ficam fixos e nesta ordem: recentes (até 28 dias), antigas, sem preço (FR-011);
  - dentro de cada grupo com preço, a ordem é por `precoMilesimos` no sentido pedido;
  - empate desempata pelo nome;
  - um posto antigo mais barato fica depois de todos os recentes;
  - inverter o sentido não muda a ordem dos grupos;
  - cada item informa o `grupo`.
- [X] T045 [P] [US1] Escrever `features/postos/domain/bbox.test.ts` para duas funções.

  **`quantizarBbox([oeste, sul, leste, norte])`**:
  - expande **para fora** numa grade de 0,02°, com aritmética inteira em centésimos para evitar
    erro de float: `[-34.915, -8.071, -34.881, -8.049]` → `[-34.92, -8.08, -34.88, -8.04]`;
  - recorta em `RMR_LIMITES` com margem;
  - a saída é sempre múltipla de 0,02.

  **`filtrarNaAreaVisivel(postos, bboxVisivel)`**, com a área bruta, sem quantizar:
  - posto dentro da área → fica;
  - posto fora da área visível, mas dentro da área quantizada → sai;
  - posto exatamente na borda → fica.
- [X] T046 [P] [US1] Escrever `features/postos/domain/agrupar.test.ts` para `agruparPostos(postos,
  bbox, zoom)`, usando `supercluster` com `radius: 60` e `maxZoom: 15`. Casos:
  - postos sobrepostos em zoom 10 viram um grupo com `quantidade` e `zoomExpansao`;
  - em zoom 16, todos viram marcadores individuais;
  - postos sem coordenada não entram.
- [X] T047 [P] [US1] Escrever `features/postos/domain/rotulos.test.ts`.

  **`rotuloMarcador(posto, hoje)`**:
  - posto com preço → `'R$ 6,59 · há 7 d'`;
  - posto sem coleta → `'sem preço'`.

  **`nomeAcessivelMarcador(posto, hoje)`**:
  - posto com preço → `'IGUEP INCORPORADORA GUEDES PEREIRA LTDA, VIBRA, gasolina comum
    R$ 6,59, coletado em 20/10/2026'`;
  - posto sem bandeira → `'bandeira não informada'`;
  - posto sem coleta → `'…, sem preço'`.
- [X] T048 [P] [US1] Escrever `features/busca/domain/buscar-municipio.test.ts` para
  `buscarMunicipio(texto)`. Casos:
  - `'jaboatao'` encontra "Jaboatão dos Guararapes";
  - `'SAO lou'` encontra "São Lourenço da Mata";
  - `'cabo'` encontra "Cabo de Santo Agostinho";
  - texto vazio → `[]`;
  - `'caruaru'` → `[]`.
- [X] T049 [P] [US1] Escrever `features/status-fontes/domain/avaliar-status.test.ts` para
  `avaliarStatus(estados, hoje)`. Casos:
  - `em_problema` em qualquer fonte → aviso;
  - `precos.ultima_edicao_fim` com mais de 14 dias → aviso, mesmo sem `em_problema`;
  - `cadastro.ultima_ok_em` com mais de 8 dias → aviso;
  - tudo ok → `null`;
  - o texto do aviso é "Alguns dados podem estar desatualizados. Última atualização bem-sucedida
    em dd/mm/aaaa.", usando a data mais antiga entre as fontes com problema, formatada por
    `lib/formato`.
- [X] T050 [P] [US1] Escrever `features/postos/domain/variacao.test.ts` para
  `calcularVariacao(atual: Coleta, anterior?: Coleta)`. Casos:
  - 6490 → 6590 resulta em `{diferencaMilesimos: 100, percentual: 1.5, desde: '2026-10-13'}`;
  - 6590 → 6390 resulta em `{-200, -3.0}`;
  - preços iguais → `{0, 0}`;
  - sem anterior → `null`;
  - percentual com 1 casa, arredondando para longe do zero, calculado com inteiros.

  A lista (FR-010) e o detalhe (FR-015) usam esta mesma função.
- [X] T051 [P] [US1] Escrever `components/mapa/MarcadorPosto.test.tsx`, com Testing Library:
  - renderiza um `<button>` com `aria-label` igual ao `nomeAcessivel` da VM;
  - mostra o `rotulo`;
  - com `semPreco`, tem forma diferente (atributo `data-variante="sem-preco"` e texto "sem
    preço");
  - com `antigo`, mostra um ícone e o texto da idade além da cor;
  - clicar chama `onSelecionar`.
- [X] T052 [P] [US1] Escrever `components/lista/ListaPostos.test.tsx`:
  - renderiza os grupos com os títulos "Coletas recentes", "Coletas antigas (mais de 4 semanas)"
    e "Sem preço", na ordem recebida;
  - cada item com preço mostra nome, bandeira, preço, "coletado em dd/mm/aaaa", idade, a fonte e
    a variação (`'+R$ 0,10 (+1,5%) desde 13/10/2026'`) ou "sem coleta anterior" (FR-010);
  - item com coleta antiga mostra o ícone de relógio e o texto "coleta antiga" junto da idade
    (FR-029);
  - item sem preço mostra nome, bandeira e "sem preço";
  - cada item é um link para `/postos/<cnpj>`;
  - lista vazia mostra "Nenhum posto nesta área";
  - `estado: 'carregando'` mostra "Carregando postos…" em `role="status"`;
  - `estado: 'erro'` sem itens mostra "Não foi possível carregar os postos." e o botão "Tentar de
    novo", que chama `onTentarDeNovo`; com itens anteriores, eles continuam e a mensagem
    aparece acima deles;
  - o botão de ordem alterna entre "Mais barato primeiro" e "Mais caro primeiro".

### Implementation for User Story 1

- [X] T053 [US1] 🔒 Criar `supabase/migrations/20261028120300_rpc_postos_na_area.sql`, conforme
  [contracts/supabase-rpc.md](./contracts/supabase-rpc.md).

  **Assinatura**: `create function public.postos_na_area(oeste double precision, sul double
  precision, leste double precision, norte double precision)`, `returns table (cnpj, nome,
  bandeira, municipio, lat, lng, preco_atual, data_atual, preco_anterior, data_anterior, fonte)`.

  **Atributos**: `language sql stable security invoker`, `set search_path = public, extensions`.

  **Comportamento**:
  - arredonda a área para fora na grade de 0,02° também no servidor, como defesa em
    profundidade;
  - recorta a área aos limites da RMR com margem;
  - filtra `ativo and localizacao is not null and localizacao &&
    st_makeenvelope(...)::geography`;
  - devolve `lat` e `lng` das colunas geradas de `postos`;
  - traz as duas últimas coletas de `gasolina_comum` com `left join lateral (... order by
    data_coleta desc limit 2)`;
  - ordena por `cnpj`;
  - `grant execute` para `anon` e `authenticated`.
- [X] T054 [US1] 🙋 Aplicar `supabase/migrations/20261028120300_rpc_postos_na_area.sql` com
  aprovação humana, depois da revisão do diff do T053 (`npx supabase db push --remote`). Em seguida,
  regenerar `lib/supabase/tipos.ts` com
  `npx supabase gen types --remote --lang typescript > lib/supabase/tipos.ts`, para que as chamadas ao
  RPC passem no `typecheck`.
- [X] T055 [P] [US1] Implementar `features/postos/domain/idade.ts` (`calcularIdade` e tipo
  `IdadeColeta`, usando `diasEntre` de `lib/formato`) até o T043 passar.
- [X] T056 [P] [US1] Implementar `features/postos/domain/ordenar-lista.ts` até o T044 passar.
- [X] T057 [P] [US1] Implementar `features/postos/domain/bbox.ts` (`quantizarBbox` e
  `filtrarNaAreaVisivel`, importando `RMR_LIMITES` de
  `@/supabase/functions/_shared/regiao-rmr`) até o T045 passar.
- [X] T058 [P] [US1] Implementar `features/postos/domain/agrupar.ts` até o T046 passar.
- [X] T059 [P] [US1] Implementar `features/postos/domain/rotulos.ts` (com `lib/formato`) até o
  T047 passar. Criar também `features/postos/domain/tipos.ts` com `PostoNoMapa` e `Coleta`
  (`{ data: string, precoMilesimos: number, fonte: string }`).
- [X] T060 [P] [US1] Criar `features/busca/data/municipios-rmr.ts`. Ele reexporta
  `MUNICIPIOS_RMR` e exporta `REGIAO_PADRAO = RMR_LIMITES` a partir de
  `supabase/functions/_shared/regiao-rmr.ts`, que é a fonte única. Implementar
  `features/busca/domain/buscar-municipio.ts` até o T048 passar.
- [X] T061 [P] [US1] Implementar `features/status-fontes/domain/avaliar-status.ts` até o T049
  passar.
- [X] T062 [P] [US1] Implementar `features/postos/domain/variacao.ts` (`calcularVariacao` e tipo
  `Variacao`) até o T050 passar.
- [X] T063 [US1] Implementar o acesso a dados em `features/postos/services/postos.service.ts` e `features/status-fontes/services/estado-fontes.service.ts`.
  Depende do T054, por causa dos tipos do RPC.

  **`features/postos/services/postos.service.ts`**: `buscarPostosNaArea(bbox)`. Chama
  `rpc('postos_na_area', …)` com o cliente do navegador e converte cada linha para
  `PostoNoMapa`, com `precoMilesimos = Math.round(preco * 1000)`. Uma coleta nula vira
  `undefined`.

  **`features/status-fontes/services/estado-fontes.service.ts`**: `buscarEstadoFontes()`. Lê
  as colunas listadas no contrato.
- [X] T064 [US1] Implementar `features/postos/viewmodels/chaves.ts`, `features/postos/viewmodels/hoje.server.ts`, `features/postos/viewmodels/useHoje.ts` e
  `features/postos/viewmodels/usePostosNaArea.ts`, depois de ler a seção "Cache server-provided
  data with Cache Components" do guia de TanStack Query do Next instalado.
  - **`chaves.ts`** define `['postos-na-area', ...bboxQuantizada]` e `['detalhe-posto', cnpj]`.
  - **`hoje.server.ts`**: `hojeParaRender()`, que importa `'server-only'` e usa `'use cache'` e
    `cacheLife('hours')` para devolver `hojeEmSaoPaulo(new Date())` sem quebrar o pré-render.
  - **`useHoje(hojeServidor)`**: `useSyncExternalStore` com `getServerSnapshot = () =>
    hojeServidor` e `getSnapshot = () => hojeEmSaoPaulo(new Date())`. No pré-render e na
    hidratação vale o valor do servidor; depois, o do navegador.
  - **`usePostosNaArea({ bboxVisivel, zoom, hoje })`**:
    - aplica `quantizarBbox`;
    - roda o `useQuery` com `placeholderData: keepPreviousData` e `enabled: bboxVisivel !==
      null`, porque a área só existe depois que o mapa carrega;
    - aplica `agruparPostos`;
    - calcula `postosVisiveis = filtrarNaAreaVisivel(postos, bboxVisivel)`, que alimenta a
      lista (cenário 8 da US1);
    - devolve `{ estado, postos, postosVisiveis, marcadores: MarcadorVM[], grupos: GrupoVM[],
      tentarDeNovo }`, com `rotulo`, `nomeAcessivel`, `antigo` e `semPreco` já calculados,
      usando `useHoje(hoje)`;
    - `estado` é `'carregando'` sem dados, `'erro'` quando a última busca falhou (os dados
      anteriores continuam em `postos`) e `'pronto'` no resto; `tentarDeNovo` chama o
      `refetch`.
- [X] T065 [P] [US1] Implementar `features/postos/viewmodels/useListaPostos.ts`. Recebe
  `(postos, hoje)`, em que `postos` são os `postosVisiveis` e `hoje` passa por `useHoje`, e
  guarda o sentido em estado local.
  - Devolve `{ grupos: {titulo, itens: ItemListaVM[]}[], vazia, sentido, alternarSentido }`.
  - O `ItemListaVM` é `{ cnpj, nome, bandeira, semPreco, preco?, data?, idade?, antiga, fonte?,
    variacao: string | null }`, com `bandeira` já como "bandeira não informada" quando nula.
  - Usa `ordenarLista`, `calcularIdade`, `calcularVariacao` e `lib/formato`.
  - `variacao` é `null` quando não há coleta anterior, e então a view mostra "sem coleta
    anterior".
- [X] T066 [P] [US1] Implementar `features/busca/viewmodels/useBuscaCidade.ts`, que devolve
  `{ texto, setTexto, resultados, selecionar }`. `selecionar` chama o callback recebido com os
  `limites` do município.
- [X] T067 [P] [US1] Implementar `features/localizacao/viewmodels/useLocalizacao.ts`:
  - `pedir()` chama `navigator.geolocation.getCurrentPosition` **só nessa chamada**;
  - devolve `'centralizado' | 'negado' | 'indisponivel' | 'fora_da_regiao'`;
  - a coordenada é entregue **apenas** ao callback `aoCentralizar(lng, lat)`;
  - a coordenada não vai para estado React persistente, `localStorage`, URL nem `console`
    (Princípio III);
  - fora da RMR (`dentroDaRmr`), não centraliza e devolve `'fora_da_regiao'`.
- [X] T068 [P] [US1] Implementar `features/status-fontes/viewmodels/useStatusFontes.ts`, com
  `useQuery` sobre `buscarEstadoFontes` e `avaliarStatus`. Devolve `{ aviso: null | { texto } }`.
  Se a leitura falhar, devolve `aviso: null`, sem travar o site.
- [X] T069 [P] [US1] Implementar `components/mapa/MarcadorPosto.tsx` e
  `components/mapa/MarcadorGrupo.tsx`, até o T051 passar. São `<button>` com Tailwind, alvo de
  toque de pelo menos 24×24 px e foco visível (`focus-visible:ring`).
  - **"Sem preço"**: borda tracejada e forma de pílula vazada.
  - **"Antigo"**: ícone de relógio, vindo do `lucide-react` instalado pelo shadcn.
  - **Grupo**: o `aria-label` é "N postos, aproximar".
- [X] T070 [P] [US1] Implementar `components/lista/ListaPostos.tsx` até o T052 passar:
  - usa `<ul>` e `<li>` semânticos e `<Link href="/postos/<cnpj>">` em cada item;
  - mostra preço, data, idade, fonte e variação, com o ícone de relógio e o texto "coleta
    antiga" quando for o caso;
  - tem os estados vazio, carregando e erro com "Tentar de novo".
- [X] T071 [P] [US1] Implementar `components/busca/BuscaCidade.tsx` com o `Command` do shadcn,
  ligado a `useBuscaCidade`:
  - rótulo visível "Buscar cidade da Região Metropolitana do Recife";
  - mensagem "Cidade fora da RMR ou não encontrada" quando não houver resultado.
- [X] T072 [P] [US1] Implementar `components/mapa/BotaoLocalizacao.tsx`:
  - botão "Usar minha localização", ligado a `useLocalizacao`;
  - mostra uma mensagem curta, em `role="status"`, para `'negado'`, `'indisponivel'` e
    `'fora_da_regiao'` ("Você está fora da área coberta");
  - não pede permissão ao montar (FR-003).
- [X] T073 [P] [US1] Implementar `components/avisos/AvisoFonte.tsx`, ligado a
  `useStatusFontes`. Usa `role="status"`, fica no topo e não cobre o mapa. Não renderiza nada
  quando `aviso` é `null`.
- [X] T074 [US1] Implementar `components/mapa/MapaPostos.tsx` (`'use client'`) e
  `components/mapa/MapaCarregavel.tsx`, depois de ler
  `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`.
  - **`MapaPostos.tsx`**:
    - usa `<Map>` de `react-map-gl/maplibre` com
      `mapStyle="https://tiles.openfreemap.org/styles/positron"`;
    - aceita `centroInicial?: { lng, lat }`: com ela, o `initialViewState` é `{ longitude,
      latitude, zoom: 15 }`; sem ela, usa `bounds: REGIAO_PADRAO`;
    - `maxBounds` igual a `REGIAO_PADRAO` com 0,3° de margem;
    - no `onLoad` e no `onMoveEnd`, envia `{ bboxVisivel, zoom }` para `usePostosNaArea`;
    - renderiza `MarcadorGrupo`, que faz `flyTo` para `zoomExpansao`, e `MarcadorPosto` dentro
      de `<Marker>`;
    - mostra sobre o mapa, sem bloqueá-lo, "Carregando postos…" em `role="status"`, ou o erro
      com o botão "Tentar de novo" (`tentarDeNovo`);
    - no `onError` do estilo do mapa, mostra "Não foi possível carregar o mapa. Use a lista.",
      e a lista continua utilizável.
  - **Comandos expostos**: centralizar em `limites` (busca) e em `lng, lat` (localização).
  - **`MapaCarregavel.tsx`**: carrega `MapaPostos` sob demanda, sem SSR, conforme o guia.
- [X] T075 [US1] Substituir o template em `app/page.tsx` pela composição do mapa, criando `components/mapa/TelaMapa.tsx` e `app/error.tsx` e editando `app/layout.tsx`,
  depois de ler `error.md` em `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/`.
  - **`components/mapa/TelaMapa.tsx`** (`'use client'`), com as props `{ hoje, centroInicial?,
    painel? }`. Layout mobile-first:
    - **até `md`**: busca no topo, mapa em tela cheia e alternância "Mapa | Lista" com o `Tabs`
      do shadcn;
    - **a partir de `md`**: painel lateral à esquerda (360 px) e mapa à direita;
    - **`painel`**: quando é passado (detalhe do posto, T089), substitui a lista no painel
      lateral e, no celular, na seção de cima;
    - **sempre**: `BotaoLocalizacao` e `AtribuicaoFontes` visíveis.

    A lista recebe `postosVisiveis`, `estado` e `tentarDeNovo` de `usePostosNaArea`, chamado no
    próprio `TelaMapa`.
  - **`app/page.tsx`** (Server Component): faz `await hojeParaRender()` e renderiza
    `<TelaMapa hoje={hoje} />` dentro de `<Suspense>`, com o fallback "Carregando postos…",
    porque as queries do TanStack ativas no primeiro render leem a hora atual.
  - **`app/layout.tsx`**: renderiza `<AvisoFonte />` no topo, acima de `{children}`, dentro do
    seu próprio `<Suspense fallback={null}>`. Assim, o aviso aparece em todas as rotas,
    inclusive `/postos/[cnpj]` (SC-008).
  - **`app/error.tsx`** (`'use client'`): mostra "Não foi possível abrir o mapa." e um botão
    "Tentar de novo", com a API de recuperação descrita em `error.md`.

  A página e os componentes **não** buscam nem calculam dados: tudo vem dos viewmodels
  (Princípio IV).
- [X] T076 [US1] Validar `app/page.tsx` com `npm run dev` nos cenários de US1 do quickstart,
  seção 6, inclusive "Falha ao carregar". Conferir nas ferramentas de desenvolvedor que nenhuma
  requisição leva coordenadas da pessoa, só a área quantizada.

  Validado em 2026-11-05, no Chrome, contra o Supabase de produção: mapa inicial, marcador com
  preço (nome acessível com a data completa), sem preço, busca ("jaboatao" e "caruaru"), lista
  (grupos e inversão da ordem), falha ao carregar (com os postos já carregados mantidos e
  "Tentar de novo") e corpo das requisições (só a área quantizada). Pendente de conferência pela
  pessoa: o cenário "Localização" no navegador (permitir e negar a permissão), coberto até aqui
  pelos testes de `pedirLocalizacao`, e o layout no celular (360 px).

**Checkpoint**: a US1 funciona sozinha e é o MVP que pode ser publicado. Antes de seguir,
`npm run typecheck`, `npm run lint` e `npm test` passam.

---

## Phase 4: User Story 2 — Ver o histórico de preços do posto (Priority: P2)

**Goal**: detalhe do posto com nome, bandeira, endereço, preço atual com data, fonte e idade,
histórico em lista e variação em R$ e % desde a coleta anterior. Cada posto tem uma URL própria,
indexável, e o histórico dos últimos 12 meses é carregado.

**Independent Test**: abrir `/postos/<cnpj>` de um posto com várias coletas, de um com uma só, de
um sem coleta, de um inativo e de um CNPJ inexistente. Conferir os cenários "Detalhe", "Link",
"Link antigo" e "Teclado" do quickstart, seção 6.

### Tests for User Story 2 (escrever primeiro; devem falhar) ⚠️

- [X] T077 [P] [US2] Escrever `features/postos/domain/detalhe.test.ts` para duas funções.

  **`montarDetalheVM(detalheRpc, hoje)`**. Casos:
  - **várias coletas**: devolve `precoAtual`, `dataAtual` em dd/mm/aaaa, `idadeTexto`
    ("coletado há 5 semanas"), `idadeAntiga`, `fonte`, `historico` (mais recente primeiro, já
    formatado) e `variacaoTexto`;
  - **uma coleta**: `variacaoTexto: null` e `semAnteriorTexto: 'Ainda não há coleta anterior
    para comparar'`;
  - **nenhuma coleta**: `semPreco: true`, com histórico vazio e sem variação;
  - **`ativo: false`**: `avisoInativo: 'Este posto não consta mais como autorizado pela ANP.'`;
  - **bandeira nula**: `'bandeira não informada'`.

  **`montarMetadadosPosto(detalheRpc)`**. Casos:
  - com preço → `{ titulo: 'IGUEP INCORPORADORA GUEDES PEREIRA LTDA — Gasosinha', descricao:
    'Gasolina comum R$ 6,59, coletado em 20/10/2026 (ANP)' }`;
  - sem coleta → descrição `'Gasolina comum: sem preço'`.
- [X] T078 [P] [US2] Escrever `components/posto/DetalhePosto.test.tsx` para os quatro estados do
  T077:
  - o título é o nome do posto;
  - a idade antiga tem destaque com ícone e texto;
  - "sem preço" não mostra valor nem variação;
  - o aviso de inativo aparece;
  - o histórico é uma lista.

  E para `PainelDetalhe`, com o roteador simulado e um `QueryClient` já com os dados do posto
  na chave `['detalhe-posto', cnpj]`:
  - com `modo="modal"`, fechar chama `back`;
  - com `modo="pagina"`, o HTML renderizado no servidor (`renderToString`) já contém o nome e o
    preço, sem portal (FR-013), e o link "Voltar ao mapa" aponta para `/`.

### Implementation for User Story 2

- [X] T079 [US2] 🔒 Criar `supabase/migrations/20261028120400_rpc_detalhe_posto.sql`, conforme
  [contracts/supabase-rpc.md](./contracts/supabase-rpc.md).

  **Assinatura**: `create function public.detalhe_posto(p_cnpj text) returns json`.

  **Atributos**: `language sql stable security invoker`, `set search_path = public, extensions`.

  **Comportamento**:
  - devolve `null` se `p_cnpj !~ '^\d{14}$'` ou se o posto não existir;
  - devolve também postos inativos, com `ativo`;
  - `coletas` vem como `json_agg` ordenado por `data_coleta desc`, só `gasolina_comum`;
  - `grant execute` para `anon` e `authenticated`.

  Criar também a função `public.cnpjs_postos_ativos() returns setof text`, usada pelo
  `generateStaticParams`.
- [X] T080 [US2] 🙋 Aplicar `supabase/migrations/20261028120400_rpc_detalhe_posto.sql` com
  aprovação humana, depois da revisão do diff do T079 (`npx supabase db push --remote`). Em seguida,
  regenerar `lib/supabase/tipos.ts` com
  `npx supabase gen types --remote --lang typescript > lib/supabase/tipos.ts`.
- [X] T081 [US2] 🔒 Criar `scripts/backfill-precos.ts`, que roda com `npx tsx
  --env-file-if-exists=.env.local`:
  - **cliente**: Supabase com `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`, que nunca são lidos
    de variáveis `NEXT_PUBLIC_`;
  - **descoberta**: lê a página do LPC, aplica `extrairLinksLpc` e baixa os arquivos um por vez,
    com pausa de 1 s entre eles;
  - **janela**: `janelaDesde` é a `--desde=AAAA-MM-DD`, se for passada, ou
    `inicioDaJanela(hoje, 12)`; só entram os links de
    `selecionarLinksPendentes(links, urlsVistas, ano(janelaDesde), Infinity)`, com
    `urlsVistas` lidas de `links_lpc`;
  - **gravação**: chama `ingerirArquivoLpc(cliente, bytes, url, janelaDesde)` do T034, o mesmo
    caminho do `sync-precos`. Os arquivos fora da janela ficam registrados como
    `fora_da_janela` e não são baixados de novo;
  - **`--dry-run`**: faz o parse e mostra as contagens sem gravar nada;
  - **relatório final**: uma tabela por semana, as edições `fora_da_janela` e a lista das
    **semanas faltando** na janela.
- [X] T082 [US2] 🙋 Rodar `scripts/backfill-precos.ts` contra produção, com aprovação humana
  depois da revisão do diff do T081:
  1. o script de carga com `--dry-run`, mostrando o relatório à pessoa;
  2. o script de carga para valer, só depois do aval;
  3. o script de carga uma segunda vez, para conferir que `gravadas: 0` em todas as semanas
     (SC-006).

  Rodar longe das 12:00 UTC (09:00 em Brasília), o horário do `sync-precos-diario`. A gravação
  aguenta as duas execuções juntas (T034), mas assim os logs não se misturam.
- [X] T083 [US2] Implementar `features/postos/domain/detalhe.ts` (`montarDetalheVM`,
  `montarMetadadosPosto` e tipo `DetalheVM`) até o T077 passar. Depende de T062 e T040.
- [X] T084 [P] [US2] Criar `lib/hydrate.ts` com o helper de hidratação pré-renderizável, copiado
  da seção "Build a prerenderable hydration state" do guia de TanStack Query do Next instalado:
  `getHydrationUpdatedAt` com `'use cache'`, `cacheTag` e `cacheLife('max')`, e `dehydrate`
  montado à mão. Importa `'server-only'`.
- [X] T085 [US2] Implementar o acesso a dados do detalhe em `features/postos/services/postos.service.ts` e `features/postos/services/postos.server.ts`.
  Depende do T080, por causa dos tipos do RPC.

  **`features/postos/services/postos.service.ts`**: acrescentar `buscarDetalhePosto(cnpj)`, que
  chama o RPC com o cliente do navegador.

  **`features/postos/services/postos.server.ts`**, que importa `'server-only'`:
  - `buscarDetalhePostoServidor(cnpj)` usa `'use cache'`, `cacheLife('hours')` e
    `cacheTag('posto:' + cnpj)`;
  - `listarCnpjsAtivos()` usa `'use cache'` e `cacheLife('hours')`;
  - os dois usam o cliente do servidor e só são chamados pelo viewmodel de servidor (T086).
- [X] T086 [US2] Implementar os viewmodels do detalhe em `features/postos/viewmodels/useDetalhePosto.ts` e `features/postos/viewmodels/detalhe-posto.server.ts`.

  **`features/postos/viewmodels/useDetalhePosto.ts`**: `useDetalhePosto(cnpj, hoje)`, com
  `useSuspenseQuery` na chave `['detalhe-posto', cnpj]` e `staleTime` de 1 h. Devolve
  `montarDetalheVM(dados, hojeAtual)`, com `hojeAtual = useHoje(hoje)`.

  **`features/postos/viewmodels/detalhe-posto.server.ts`**:
  - `montarEstadoDetalhe(cnpj)` devolve `{ existe: boolean, estado: DehydratedState, centro:
    { lng, lat } | null }`, usando `buscarDetalhePostoServidor` e o `dehydrate` de
    `lib/hydrate.ts`, com a mesma chave e a tag `posto:<cnpj>`. O `centro` vem de `lat` e `lng`
    do detalhe e é `null` quando o posto não tem localização;
  - `listarCnpjsParaPrerender()` chama `listarCnpjsAtivos()` e lança um erro claro se a lista
    vier vazia, porque o `generateStaticParams` não aceita lista vazia;
  - `metadadosPosto(cnpj)` devolve `{ titulo, descricao } | null`, com `montarMetadadosPosto`
    sobre o resultado de `buscarDetalhePostoServidor`, que já está em cache.
- [X] T087 [P] [US2] Implementar `components/posto/HistoricoPrecos.tsx`: uma `<ol>` com a data e
  o preço de cada coleta, sem gráfico (R14).
- [X] T088 [US2] Implementar `components/posto/DetalhePosto.tsx` e `components/posto/PainelDetalhe.tsx` até o T078 passar:
  - **`DetalhePosto`** recebe `DetalheVM` e mostra nome, bandeira, endereço, preço atual,
    "coletado em dd/mm/aaaa", fonte, idade (com destaque se antiga), `variacaoTexto` ou
    `semAnteriorTexto`, `HistoricoPrecos` e o aviso de inativo;
  - **`PainelDetalhe`** recebe `{ modo, cnpj, hoje }`, chama `useDetalhePosto(cnpj, hoje)` e
    renderiza `<DetalhePosto vm={…} />`. É o único componente que chama os hooks do detalhe; o
    `DetalhePosto` só renderiza o que recebe (Princípio IV). Conforme o `modo`:
    - `modo="modal"`: envolve o detalhe com o `Sheet` do shadcn (`side="bottom"` até `md` e
      `side="right"` a partir de `md`); fechar chama `router.back()`;
    - `modo="pagina"` (link direto): renderiza o detalhe direto na página, numa
      `<section aria-labelledby>`, **sem portal**, para que o nome e o preço entrem no HTML
      (FR-013). O portal do `Sheet` não renderiza no servidor. Um link "Voltar ao mapa" leva
      para `/`, então fechar nunca leva para fora do site.
- [X] T089 [US2] Criar `app/postos/[cnpj]/page.tsx`, `app/postos/[cnpj]/not-found.tsx` e `app/postos/[cnpj]/error.tsx`, depois de
  ler `generate-static-params.md` (seção "With Cache Components"), `generate-metadata.md`,
  `not-found.md` e `error.md` em `node_modules/next/dist/docs/01-app/03-api-reference/`.
  - **`generateStaticParams`**: usa `listarCnpjsParaPrerender()` do viewmodel de servidor
    (T086). Nenhum arquivo de `app/` importa `features/*/services` (Princípio IV).
  - **`generateMetadata`**: usa `metadadosPosto(cnpj)` do mesmo viewmodel. O título é
    "<nome> — Gasosinha" e a descrição é "Gasolina comum R$ x,xx, coletado em dd/mm/aaaa
    (ANP)", ou "Gasolina comum: sem preço".
  - **Página**:
    - lê `params` dentro de `<Suspense>`, com o fallback "Carregando posto…" em
      `role="status"`;
    - chama `montarEstadoDetalhe` e `hojeParaRender()`, e `notFound()` se o posto não existir;
    - renderiza `<HydrationBoundary>` em volta de `<TelaMapa hoje centroInicial={centro}
      painel={<PainelDetalhe modo="pagina" cnpj={cnpj} hoje={hoje} />} />`, com o mapa centralizado no
      posto (cenário 7 da US2). Posto sem localização abre na região padrão.
  - **`not-found.tsx`**: mostra "Posto não encontrado" e um link "Voltar ao mapa".
  - **`error.tsx`**: mostra "Não foi possível carregar este posto." e um botão "Tentar de novo",
    com a API de recuperação descrita em `error.md`.
- [X] T090 [US2] Implementar o detalhe como modal sobre o mapa em `app/@detalhe/(.)postos/[cnpj]/page.tsx`, ao navegar de dentro do site,
  depois de ler `parallel-routes.md` (seção "Modals"), `intercepting-routes.md` e `default.md`
  em `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/`.
  - **Arquivos**:
    - `app/@detalhe/default.tsx`, que retorna `null`;
    - `app/@detalhe/(.)postos/[cnpj]/page.tsx`, com o mesmo `montarEstadoDetalhe`, o `hoje` de
      `hojeParaRender()` e `<PainelDetalhe modo="modal" cnpj={cnpj} hoje={hoje} />`, dentro de
      `<Suspense>` com o
      fallback "Carregando posto…";
    - `app/@detalhe/(.)postos/[cnpj]/error.tsx`, que mostra "Não foi possível carregar este
      posto." e "Tentar de novo" dentro do modal, para que um erro no modal não derrube o site.
  - **Layout**: em `app/layout.tsx`, renderizar o slot `detalhe`.
  - **Seleção**: em `MarcadorPosto` e `ListaPostos`, selecionar um posto navega para
    `/postos/<cnpj>`.
  - **Foco**: ao fechar, o foco volta ao elemento que abriu o detalhe. Guardar o `cnpj` de
    origem num `ref` do viewmodel da página e focar o item correspondente depois do
    `router.back()` (US2, cenário 6).
- [X] T091 [US2] Validar `app/postos/[cnpj]/page.tsx` com `npm run dev` nos cenários "Detalhe", "Link", "Link antigo" e
  "Teclado" do quickstart, seção 6. Rodar `npm run build` e confirmar que `/postos/[cnpj]` é
  pré-renderizado, que o HTML contém o nome e o preço, e que o build não acusa nenhum erro de
  "current-time prerender".

  Validado em 2026-11-05, no Chrome, contra o Supabase de produção:
  - **Detalhe:** abrir pela lista abre o modal sobre o mapa, com nome, bandeira, endereço, preço,
    data, idade, fonte, variação e 51 coletas no histórico;
  - **Teclado:** Enter abre o modal com o foco dentro dele, Esc fecha, e o foco volta ao item;
  - **Link:** o link direto abre a página com o detalhe no painel e o mapa centralizado no posto;
    título, descrição e "Voltar ao mapa" (`/`) corretos;
  - **Link antigo:** `/postos/00000000000000` mostra "Posto não encontrado" com `noindex`. Não há
    posto inativo hoje; o aviso de inativo está coberto pelos testes do T077 e do T078;
  - posto sem coleta e posto com uma coleta só exibem "sem preço" e "Ainda não há coleta anterior
    para comparar", respectivamente.

  O `next build` pré-renderiza as 403 páginas sem erro, com nome, preço, título e descrição no HTML.

**Checkpoint**: US1 e US2 funcionam, cada uma de forma independente. Antes de seguir,
`npm run typecheck`, `npm run lint` e `npm test` passam.

---

## Phase 5: User Story 3 — Gasosinha reage à variação (Priority: P3)

**Goal**: o mascote em pixel art mostra a reação "subiu", "caiu", "estável" ou "neutro", com o
texto curto da variação. Ele fica parado quando a pessoa prefere menos movimento.

**Independent Test**: abrir o detalhe de postos com preço que subiu, que caiu, que ficou igual e
com uma só coleta, com e sem "reduzir movimento" ativo no sistema. Conferir os cenários
"Gasosinha" e "Menos movimento" do quickstart, seção 6.

### Tests for User Story 3 (escrever primeiro; devem falhar) ⚠️

- [X] T092 [P] [US3] Escrever `features/gasosinha/domain/reacao.test.ts`.

  **`classificarReacao(atual?, anterior?)`**, comparando `precoMilesimos`:
  - maior → `'subiu'`;
  - menor → `'caiu'`;
  - igual → `'estavel'`;
  - sem anterior ou sem atual → `'neutro'`.

  **`textoReacao(reacao, variacao, temPreco)`**, montado com `formatarPreco` (valor absoluto),
  `formatarPercentual` e `formatarData` de `lib/formato`:
  - subiu → `'Subiu R$ 0,10 (+1,5%) desde 13/10/2026'`;
  - caiu → `'Caiu R$ 0,20 (−3,0%) desde 13/10/2026'`;
  - estável → `'Mesmo preço da coleta de 13/10/2026'`;
  - neutro com preço → `'Ainda não há coleta anterior para comparar'`;
  - neutro sem preço → `'Sem preço coletado'`.
- [X] T093 [P] [US3] Escrever `components/gasosinha/Gasosinha.test.tsx`:
  - para cada reação, usa a pose da arte em `public/gasosinha/`, nas versões clara e `-dark`,
    com `alt=""`: subiu → `gasosinha-surpreso`, caiu → `gasosinha-feliz`, estável →
    `gasosinha-piscando`, neutro → `gasosinha-pensando`;
  - o `texto` está visível dentro de um elemento com `aria-live="polite"`;
  - sem `parado`, o elemento animado tem `data-parado="false"` e a classe `animate-pulinho`;
  - com `parado`, ele tem `data-parado="true"` e não tem a classe de animação.

### Implementation for User Story 3

- [X] T094 [US3] Implementar `features/gasosinha/domain/reacao.ts` (`classificarReacao`,
  `textoReacao` e tipo `Reacao`) até o T092 passar.
- [X] T095 [P] [US3] Implementar `features/gasosinha/viewmodels/usePrefereMenosMovimento.ts`:
  `useSyncExternalStore` sobre `matchMedia('(prefers-reduced-motion: reduce)')`, com valor
  `true` no servidor, ou seja, parado por padrão.
- [X] T096 [US3] Implementar `components/gasosinha/Gasosinha.tsx` e a animação em
  `app/globals.css` até o T093 passar:
  - a pose da reação vem da arte do mascote, com a versão clara e a `-dark` alternadas pela
    classe `dark` do `<html>`, como no `PoseGasosinha`. A arte tem um quadro por pose;
  - a animação é um pulinho em 4 degraus de 0,8 s em loop: `--animate-pulinho` no `@theme`,
    com `@keyframes pulinho` e `step-end`, para manter o jeito de pixel art;
  - com `parado`, mostra a pose fixa, sem a classe de animação;
  - por segurança, há também `motion-reduce:animate-none`.
- [X] T097 [US3] Integrar o Gasosinha ao detalhe em `features/postos/domain/detalhe.ts` e `components/posto/DetalhePosto.tsx`:
  - estender `montarDetalheVM` em `features/postos/domain/detalhe.ts` com `reacao` e
    `textoReacao`, atualizando `features/postos/domain/detalhe.test.ts` antes;
  - renderizar `<Gasosinha reacao texto parado>` em `components/posto/DetalhePosto.tsx`, com
    `parado` vindo de `usePrefereMenosMovimento()`, chamado no `PainelDetalhe` e repassado ao
    `DetalhePosto`.
- [X] T098 [US3] Validar `components/gasosinha/Gasosinha.tsx` no detalhe com os cenários "Gasosinha" e "Menos movimento" do quickstart,
  seção 6, nos quatro tipos de posto.

  Validado em 09/11/2026 no `next dev`, com dados de produção, em `/postos/[cnpj]`:
  - **Gasosinha**, um posto de cada tipo, no HTML do servidor e no navegador:
    - subiu: pose surpreso, "Subiu R$ 0,26 (+4,0%) desde 08/01/2026";
    - caiu: pose feliz, "Caiu R$ 0,12 (−1,7%) desde 19/10/2026";
    - estável: pose piscando, "Mesmo preço da coleta de 28/09/2026";
    - uma coleta: pose pensando, "Ainda não há coleta anterior para comparar";
    - sem preço: pose pensando, "Sem preço coletado".
  - No HTML só aparecem as duas imagens da pose (clara e `-dark`), com `alt=""`, e o texto fica
    em `aria-live="polite"`. Os temas claro e escuro trocam a pose e as cores do balão.
  - **Menos movimento**: o servidor manda o mascote parado (`data-parado="true"`). Depois da
    hidratação, sem a preferência, ele anima com `pulinho 0.8s steps(1) infinite` em 3 alturas
    (0, −3 e −6 px). A regra `@media (prefers-reduced-motion: reduce)` com `animation: none` está
    no CSS servido. A troca real da preferência do sistema ficou coberta pelos testes do
    `usePrefereMenosMovimento` e do `PainelDetalhe`, porque a automação do navegador não muda essa
    configuração.
  - Ajuste feito na validação: o balão neutro ganhou um contorno fino, porque sumia sobre o vidro
    quando o mapa atrás era claro.
  - Observação: o `next dev` que já estava aberto não gerou a classe nova do Tailwind, criada numa
    pasta nova. Foi preciso reiniciar o servidor.

**Checkpoint**: todas as histórias funcionam de forma independente. Antes de seguir,
`npm run typecheck`, `npm run lint` e `npm test` passam.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: qualidade, publicação e validação dos critérios de sucesso.

- [X] T099 [P] Fazer a auditoria dos Princípios II a IV e VIII em `app/`, `components/`, `features/`, `lib/` e `supabase/functions/`:
  - **Princípio II**: `grep` para garantir que não há `any` sem justificativa, que nenhuma
    variável `NEXT_PUBLIC_*` contém `SERVICE_ROLE` ou `SECRET`, e que nenhum secret
    das Edge Functions usa o prefixo `NEXT_PUBLIC_`;
  - **Princípio III**: conferir que `useLocalizacao` não grava a posição em nenhum lugar;
  - **Princípio IV**: nenhum arquivo em `app/` ou `components/` importa `features/*/services` ou
    `@supabase/supabase-js`;
  - **Princípio VIII**: só `lib/formato` formata moeda, data, idade, percentual e variação.

  Corrigir o que aparecer.
- [X] T100 Rodar os scripts de `package.json` (`npm run typecheck`, `npm run lint`, `npm test` e `npm run build`) e garantir que
  todos passam sem erro, inclusive sem erro de "current-time prerender" no build (Quality Gates
  da constituição).
- [ ] T101 🙋 Com aprovação humana, publicar na Vercel (Hobby) com as variáveis de `.env.example`. Configurar
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `NEXT_PUBLIC_SITE_URL`. **Não**
  configurar a service role na Vercel. Depois, definir `SITE_URL` nos secrets das Edge Functions
  (`npx supabase secrets set SITE_URL=<url da Vercel>`), porque ela é usada no `User-Agent`.
- [ ] T102 Medir o SC-003 em produção, conforme `specs/001-gas-price-map/quickstart.md`, seção 7: perfil de 9 Mbps e 170 ms,
  CPU 4× mais lenta e cache vazio, com média de 3 tentativas. Se passar de 3 s, otimizar:
  carregar o mapa sob demanda, adiar o estilo, reduzir o JavaScript inicial. Registrar o
  resultado na descrição do PR.
- [ ] T103 Rodar o Lighthouse (Acessibilidade) em `/` e `/postos/<cnpj>`, conforme o quickstart,
  seção 9. Corrigir as falhas de contraste, de nome acessível e de foco (SC-009).
- [ ] T104 🙋 Com aprovação humana, simular a falha de fonte em produção, conforme `specs/001-gas-price-map/quickstart.md`, seção 8.
  Antes de pedir a aprovação, avisar que, durante o teste, o aviso de fonte fica visível ao
  público.
  1. trocar `LPC_PAGINA_URL` por uma URL inválida e chamar o `sync-precos` duas vezes;
  2. conferir o aviso em `/` e em `/postos/<cnpj>`, e que a segunda chamada mantém o mesmo
     `problema_desde`;
  3. restaurar com `npx supabase secrets unset LPC_PAGINA_URL` e chamar de novo;
  4. conferir que o aviso some das duas páginas (FR-027 e SC-008).
- [X] T105 [P] Atualizar `README.md` em pt-BR com:
  - o que é o Gasosinha;
  - as fontes e a atribuição (ANP, OpenStreetMap e OpenFreeMap);
  - a arquitetura (MVVM e ingestão), com links para `specs/001-gas-price-map/`;
  - como rodar os testes;
  - um aviso sobre as áreas sensíveis do Princípio IX.
- [ ] T106 Registrar em `specs/001-gas-price-map/plan.md` o resultado da checagem: uma semana depois da publicação, conferir no painel do Supabase que o projeto não foi
  pausado por inatividade (quickstart, seção 10, risco R16). Se tiver sido, registrar no
  `plan.md` a decisão sobre um ping externo gratuito.

---

## Phase 7: Detalhes (ajustes de experiência apontados pelo usuário)

**Purpose**: ajustes de interface e de experiência que o usuário apontou usando o site. Toda
observação nova dele que não for para aplicar na hora entra aqui, como um bloco novo no fim da
fase, com IDs seguindo o último.

**Quando rodar**: de preferência antes da Fase 6, para que o build (T100), a medição (T102) e o
Lighthouse (T103) validem a interface final.

**Independent Test**: no computador, com o detalhe de um posto aberto, arrastar e dar zoom no
mapa, rolar a lista e abrir outro posto sem fechar o detalhe. Numa área grande, a lista mostra os
postos aos poucos. No detalhe, o histórico mostra as coletas recentes e o resto sob demanda. Na
lista, o selo de variação cabe numa linha.

### D1 — O detalhe não trava o mapa nem a lista (apontado em 09/11/2026)

Hoje, no computador, o detalhe abre num `Sheet` modal (Radix Dialog). O fundo é transparente,
mas a camada de sobreposição continua capturando os cliques, a rolagem fica travada e o resto da
tela fica inerte. Um clique fora fecha o detalhe (`onOpenChange` → `router.back()`). Para mexer
no mapa ou rolar a lista, a pessoa precisa fechar o detalhe ou clicar fora dele.

- [X] T107 Escrever os testes primeiro, no bloco `PainelDetalhe` de
  `components/posto/DetalhePosto.test.tsx`, simulando `(min-width: 768px)`:
  - o painel não é modal: não há sobreposição, um botão fora dele continua clicável, e clicar fora
    não chama `router.back()`;
  - `Esc` e "Fechar" continuam fechando, com um `router.back()`;
  - ao abrir, o foco vai para o painel.
- [X] T108 Em `components/posto/PainelDetalhe.tsx`, no computador, usar `Sheet` com
  `modal={false}`, sem sobreposição:
  - cancelar `onInteractOutside` e `onFocusOutside`, para que arrastar ou dar zoom no mapa e
    rolar a lista não fechem o detalhe;
  - manter `role="dialog"`, o título acessível, o foco inicial no painel e a volta do foco ao
    item de origem quando ele fecha, que o `TelaMapa` já faz;
  - no celular, o detalhe continua modal, porque a folha cobre quase a tela toda. Confirmar com
    o usuário na execução se ele quer outro comportamento ali.
- [X] T109 Abrir outro posto com o detalhe aberto sem empilhar o histórico:
  - hoje o marcador navega com `router.push` (`components/mapa/MapaPostos.tsx`) e a lista com
    `Link` (`components/lista/LinhaPosto.tsx`). Abrir B com A aberto e fechar voltaria para A;
  - com o detalhe aberto, os dois navegam com `replace`, para que "Fechar" volte ao mapa num
    passo só;
  - a informação "detalhe aberto" vem de um viewmodel (por exemplo, `useDetalheAberto()` sobre
    `usePathname`), não da view (Princípio IV);
  - teste: abrir A, abrir B e fechar leva a `/`.
- [X] T110 Atualizar `specs/001-gas-price-map/contracts/ui.md`, que hoje descreve o
  `<PainelDetalhe>` modal: no computador, painel lateral não modal; no celular, `Sheet` modal.
  Se o cenário 6 da US2 mudar, atualizar também a seção 6 do quickstart.

### D2 — Paginação da lista de postos e do histórico (apontado em 09/11/2026)

Hoje, numa área grande, a lista mostra todos os postos de uma vez: centenas de linhas, com as
coletas antigas e os postos sem preço no fim. O detalhe também lista de uma vez todas as coletas
dos últimos 12 meses, que podem ser dezenas de linhas.

Padrão proposto: um botão "Mostrar mais", em vez de páginas numeradas. Ele funciona bem no
celular e no teclado, e o mais barato continua no topo (SC-004).

- [X] T111 [P] Escrever `features/postos/domain/paginar.test.ts` para
  `paginarGrupos(grupos, quantidade)`:
  - corta na ordem dos grupos (recente, depois antiga, depois sem preço);
  - omite os grupos que ficaram vazios;
  - devolve quantos itens faltam;
  - com `quantidade` maior que o total, devolve tudo.
- [X] T112 Implementar `features/postos/domain/paginar.ts` e integrar em
  `features/postos/viewmodels/useListaPostos.ts`:
  - páginas de 20 postos (constante `POSTOS_POR_PAGINA`);
  - volta para a primeira página quando a área visível ou a ordem de preço mudam;
  - o título continua com o total da área ("143 postos nesta área");
  - o texto do botão vem pronto do viewmodel ("Mostrar mais 20 de 123 restantes").
- [X] T113 Em `components/lista/ListaPostos.tsx`, colocar o botão "Mostrar mais" abaixo da
  lista; ao clicar, o foco vai para o primeiro item novo. Antes, atualizar
  `components/lista/ListaPostos.test.tsx`:
  - renderiza 20 itens e o botão;
  - o clique mostra mais 20 e move o foco;
  - o botão some quando não há mais itens.
- [X] T114 No detalhe, "Todas as coletas" (`components/posto/HistoricoPrecos.tsx`) mostra as 6
  mais recentes e um botão que revela mais 10 por vez:
  - o estado da paginação fica num viewmodel, como o `sentido` da lista, e a view só renderiza;
  - o FR-014 continua atendido, porque todas as coletas seguem acessíveis;
  - na página `/postos/[cnpj]`, o HTML do servidor traz as 6 primeiras;
  - antes, escrever os testes em `components/posto/DetalhePosto.test.tsx`.

### D3 — Selo de variação da lista menor e numa linha só (apontado em 09/11/2026)

Hoje, na lista, o selo "−R$ 0,10 (−1,5%) desde 22/10/2026" quebra em duas linhas e fica grande
(captura do usuário, no tema escuro).

- [X] T115 [P] Em `lib/formato/formato.test.ts`, testar
  `formatarVariacaoCurta(variacao, dataAtual)`:
  - sem "R$", que já está no preço da linha, como o "+0,40" do "acima do mais barato":
    `"−0,10 (−1,5%) desde 22/10"`;
  - com 3 casas: `"+0,015 (+0,2%) desde 22/10"`;
  - mesmo preço: `"0,00 (0,0%) desde 22/10"`;
  - coleta anterior de outro ano que a mais recente: `"desde 22/12/25"`.
- [X] T116 Implementar `formatarVariacaoCurta` em `lib/formato/formato.ts` (Princípio VIII):
  - trocar `ItemListaVM.variacao` por `{ curta, acessivel } | null` em
    `features/postos/viewmodels/tipos.ts` e `features/postos/viewmodels/montar-vm.ts`,
    atualizando antes `montar-vm.test.ts`;
  - `curta` aparece no selo;
  - `acessivel` fica em `sr-only`, com a data completa para leitores de tela: "Variação: −R$ 0,10
    (−1,5%) desde 22/10/2026".
- [X] T117 Em `components/lista/Selos.tsx` e `components/lista/LinhaPosto.tsx`, deixar o selo da
  lista numa linha (`whitespace-nowrap`) e menor: texto de 11 px, ícone de 10 px e cerca de 18 px
  de altura, como o "Mais barato". Atualizar `components/lista/ListaPostos.test.tsx`. O detalhe
  não muda: o balão do Gasosinha mantém o texto completo.
- [X] T118 Validar D1 a D3 no navegador, nos temas claro e escuro, com 320, 375 e 1280 px de
  largura:
  - **D1**: com o detalhe aberto, arrastar e dar zoom no mapa, rolar a lista, abrir outro posto
    e fechar, voltando ao mapa. No teclado, o Tab chega ao painel, o `Esc` fecha e o foco volta
    ao item;
  - **D2**: a região inteira mostra 20 postos e o botão, e mudar a área volta à primeira página.
    Um histórico longo mostra 6 coletas e o botão;
  - **D3**: o selo cabe numa linha com 320 px. Se não couber, ajustar o formato curto (por
    exemplo, `"−0,10 · −1,5% · 22/10"`) e registrar aqui.

  Validado em 09/11/2026 no `next dev`, com dados de produção. Na primeira tentativa, o
  `next dev` falhou ao abrir um posto ("Failed to generate static paths", processo auxiliar morto
  com 0,7 GB de memória livre). O servidor foi reiniciado com a autorização do usuário.
  - **D1**, no computador (1536 px):
    - o detalhe abre sem sobreposição, sem `aria-modal`, sem trava de rolagem e com o foco no
      painel;
    - com ele aberto, o mapa arrasta e a lista rola (300 px), e o detalhe continua aberto;
    - abrir outro posto pela lista e depois pelo marcador do mapa troca o detalhe sem crescer o
      `history.length`;
    - "Fechar" e o `Esc` voltam para `/` num passo só, com o foco no último posto escolhido (o item
      da lista ou o marcador);
    - pelo teclado, Enter no item abre o detalhe com o foco nele;
    - o detalhe anterior fica oculto (`display: none`, largura 0), pela preservação de estado do
      Next, fora da árvore de acessibilidade;
    - no celular (375 px), o detalhe continua na folha de baixo, com sobreposição (modal).
  - **D2**:
    - na lista, 20 de 360 postos; o clique mostra 40 e põe o foco no item 21, e trocar a ordem
      volta para 20;
    - na página de um posto com 51 coletas, 6 coletas e "Mostrar mais 10 (faltam 45)"; o clique
      mostra 16, com o foco na sétima;
    - o botão quebrava em duas linhas no cartão de 336 px, então o texto passou a "Mostrar mais 20
      (faltam 340)", numa linha só.
  - **D3**, nos temas escuro e claro:
    - o selo fica numa linha, com 18 px de altura no computador e 20 px no celular;
    - em 375 px, "−0,10 (−1,4%) desde 21/10" cabe ao lado do preço;
    - em 320 px, o selo passava 26 px da coluna. Por isso, abaixo de 360 px o "desde" some e a
      letra cai para 11 px ("−0,10 (−1,4%) 16/10"), e agora nenhum selo passa da coluna. O texto
      completo continua para leitores de tela.

### D4 — Pelo link direto, o detalhe também fica à direita (apontado em 09/11/2026)

Hoje, quem abre `/postos/[cnpj]` direto, ou atualiza a página com um posto aberto, cai no modo
página. O `TelaMapa` recebe o detalhe no `painel` e o põe no lugar da lista, à esquerda. Assim a
lista some e a pessoa não consegue navegar pelos outros postos. Pelo site, o detalhe abre à
direita. O usuário quer o detalhe sempre à direita, venha a pessoa de onde vier.

- [X] T119 Escrever os testes primeiro, no bloco `PainelDetalhe` de
  `components/posto/DetalhePosto.test.tsx`, para o `modo="pagina"` no computador:
  - o HTML do servidor continua com o nome e o preço, sem portal (FR-013, R11);
  - o detalhe é um cartão à direita, não um diálogo, com `aria-labelledby` no nome;
  - "Fechar" leva a `/` com `replace`, nunca voltando no histórico, para não sair do site (caso de
    borda "Fechar o detalhe aberto por link").
- [X] T120 Em `app/postos/[cnpj]/page.tsx` e `components/mapa/TelaMapa.tsx`, no computador:
  - a lista continua à esquerda;
  - o detalhe vai num cartão de vidro à direita, igual ao do modal (336 px, `top-4 right-4`),
    renderizado no próprio HTML, sem portal;
  - o mapa centraliza o posto descontando o cartão da direita, para ele não ficar escondido
    embaixo;
  - se um modal de outro posto abrir por cima (`useDetalheAberto()`), o cartão da página se
    esconde, e volta quando o modal fecha;
  - no celular não há lado. Seguir o comportamento do modal, a folha de baixo por cima do mapa,
    se der para renderizar sem portal; se não der, manter a página como hoje. Confirmar com o
    usuário na execução.
- [X] T121 Atualizar `specs/001-gas-price-map/contracts/ui.md` (`<PainelDetalhe modo="pagina">` e
  o `painel` do `<TelaMapa>`) e o cenário de link direto da seção 6 do quickstart.

### D5 — Escolher um posto na lista centraliza o mapa nele (apontado em 09/11/2026)

Hoje, escolher um posto na lista abre o detalhe, mas o mapa não se move. A pessoa não vê onde o
posto fica. Só o link direto centraliza, pelo `centroInicial`.

Pontos de atenção da análise:
- centralizar muda a área visível, e a lista acompanha a área (FR-010). Ela se reordena e volta à
  primeira página. O posto escolhido continua nela, porque o mapa centraliza nele, mas pode ficar
  depois dos 20 primeiros;
- por isso, ao fechar o detalhe, o item de origem pode não estar mais na lista. O foco precisa de
  um destino alternativo: o marcador do posto ou o título da lista;
- num zoom baixo, o posto está dentro de um grupo (cluster). Só mover o mapa não mostra o
  marcador dele.

- [X] T122 [P] Escrever `features/postos/domain/foco.test.ts` para `planejarFoco(posto, zoomAtual)`:
  - com o posto visível sozinho no zoom atual, só move o centro e mantém o zoom;
  - com o posto dentro de um grupo, aproxima até ele aparecer sozinho (`ZOOM_PONTO`, 15);
  - a posição do posto vem dos `postosVisiveis` e nunca da posição da pessoa (Princípio III).
- [X] T123 Implementar `features/postos/domain/foco.ts` e integrar:
  - em `components/mapa/MapaPostos.tsx`, um comando novo no `ControleMapa` (`focarPosto`) que usa
    `easeTo` e desconta a lista à esquerda e o cartão do detalhe à direita (`margensDoMapa`);
  - em `components/mapa/TelaMapa.tsx`, ao escolher um posto na lista, focar o posto pelo CNPJ;
  - destacar o marcador do posto aberto (`selecionado` no `MarcadorVM`, com o destaque também na
    forma, não só na cor), em `features/postos/viewmodels/montar-vm.ts` e
    `components/mapa/MarcadorPosto.tsx`, com os testes deles antes;
  - ao fechar o detalhe, o foco volta ao item de origem; se ele não estiver mais na lista, vai
    para o marcador do posto e, sem marcador, para o título da lista.

### D6 — Lista mais compacta, para sobrar mais mapa (apontado em 09/11/2026; opção (a) escolhida)

No computador, a lista é um cartão de 336 px à esquerda, com até 680 px de altura. Com o detalhe
aberto à direita, sobram uns 800 px de mapa numa tela de 1536 px. Opções analisadas:
- **(a) Lista recolhível** (recomendada): um botão "Recolher lista" deixa só uma pílula com a
  contagem ("360 postos · Ver lista"), e o mapa fica inteiro. É o maior ganho e não piora a
  leitura. A área visível passa a descontar só a pílula;
- **(b) Cartão mais estreito e linhas mais compactas** (336 para cerca de 300 px, menos
  espaçamento): ganha uns 36 px de largura, mas mais nomes de posto quebram em 3 linhas;
- **(c) Altura menor** (máximo de 680 para cerca de 520 px): libera o canto inferior esquerdo,
  mas mostra menos postos sem rolar.

- [X] T124 🧭 Antes de implementar, confirmar com o usuário a opção (a), (b), (c) ou uma
  combinação, e registrar a escolha aqui.

  **Escolha do usuário em 09/11/2026: (a) lista recolhível.** O cartão continua com 336 px e
  680 px de altura quando aberto.
- [X] T125 Implementar a lista recolhível no computador (a partir de `md`), em
  `components/mapa/TelaMapa.tsx` e `components/lista/ListaPostos.tsx`, com os testes antes. No
  celular nada muda, porque lá a lista já alterna com o mapa ("Ver lista" e "Ver mapa"):
  - um botão "Recolher lista" no cabeçalho do cartão troca o cartão por uma pílula no mesmo
    canto, com a contagem e a ação de abrir ("360 postos · Ver lista"). A pílula mostra o mesmo
    `titulo` do viewmodel, sempre o total da área;
  - a busca de cidade continua alcançável com a lista recolhida, por um botão de busca na pílula
    que expande a lista com o foco no campo;
  - o estado de recolhido fica num viewmodel, não na view, e dura enquanto a página estiver
    aberta. Abrir um posto não expande a lista;
  - os botões têm nome acessível e `aria-expanded`. O foco vai para a pílula ao recolher e para o
    título da lista ao expandir;
  - a medição da cobertura (`cobertura.esquerda`) passa a descontar só a pílula quando a lista
    está recolhida, para a contagem e a régua continuarem sendo só o que a pessoa vê;
  - atualizar `contracts/ui.md` (o `<TelaMapa>` e um componente novo para a pílula, se houver).

### D7 — Ponto de "você está aqui" no mapa (apontado em 09/11/2026; depende de emenda)

O usuário quer um ponto com a posição da pessoa, como no Google Maps.

**Bloqueio**: o Princípio III da constituição e o FR-004 da spec dizem que a posição "DEVE ser
usada apenas para centralizar o mapa". Mostrar um ponto é outro uso, então este bloco só roda
depois de uma emenda via `/speckit-constitution`. A governança diz que só o usuário muda a
constituição.

O resto do Princípio III continua valendo, e a implementação respeita tudo: a posição não vai ao
backend, não é guardada (banco, `localStorage`, `sessionStorage`, cookies ou URL), não aparece
em logs e não entra nas consultas, que seguem usando só a área visível.

- [X] T126 🙋 O usuário emenda o Princípio III via `/speckit-constitution` (versão MINOR). Texto
  sugerido: "a posição pode ser mostrada como um ponto no mapa, que acompanha o movimento
  enquanto o site está visível, só no navegador e só em memória, depois que a pessoa pedir a
  localização". Depois, atualizar o FR-004 da spec e o contrato do
  `useLocalizacao` em `contracts/ui.md`, que hoje diz que a posição não passa por estado React.
- [X] T127 Escrever os testes primeiro, em `features/localizacao/viewmodels/`:
  - o ponto só aparece depois de "Usar minha localização"; o site continua sem pedir a
    localização sozinho (FR-003);
  - a posição fica só em memória: nada em `localStorage`, `sessionStorage`, cookies ou URL, e
    nenhuma requisição a recebe (`fetch` simulado);
  - permissão negada, erro ou revogação tiram o ponto e mostram o aviso de hoje (FR-005);
  - acompanhamento: cada posição nova move o ponto; com a aba oculta, o acompanhamento para
    (`clearWatch`) e volta quando ela reaparece;
  - modo seguir: depois do clique, o mapa segue a posição. Arrastar o mapa desliga o modo seguir,
    e o ponto continua se movendo. O botão de localização religa.
- [X] T128 Implementar o ponto em `components/mapa/MapaPostos.tsx` e no viewmodel de
  localização. Comportamento escolhido pelo usuário em 09/11/2026, como no Google Maps:
  - **ponto**: azul, com um halo do tamanho da precisão informada pelo aparelho, e `aria-label`
    "Você está aqui";
  - **posição dinâmica**: depois do clique, `watchPosition` com alta precisão, e o ponto
    acompanha o movimento. Com a aba oculta, como na tela apagada ou em outro app, o
    acompanhamento para, para poupar bateria e privacidade, e volta quando a aba reaparece;
  - **mapa que segue**: depois do clique, o mapa vai seguindo a pessoa. Se ela arrastar o mapa,
    ele para de seguir e o ponto continua andando. Tocar de novo no botão de localização volta a
    seguir. O botão mostra se o modo seguir está ligado (`aria-pressed`);
  - **fora do escopo**: a seta de direção, que pediria a bússola e outra permissão no iPhone, e a
    rota até o posto, que a spec já deixa de fora;
  - **limites de site, para registrar no `research.md`**: a posição só atualiza com o site
    aberto e visível. No computador, ela vem do Wi-Fi e pode errar por centenas de metros, o que
    o halo mostra.
- [X] T129 Validar D4 a D7 no navegador, nos temas claro e escuro, com 320, 375 e 1280 px:
  - **D4**: o link direto e a atualização da página mostram o detalhe à direita e a lista à
    esquerda; "Fechar" vai para `/`;
  - **D5**: escolher um posto na lista centraliza e destaca o marcador, inclusive quando ele
    estava dentro de um grupo; fechar devolve o foco;
  - **D6**:
    - recolher troca o cartão pela pílula, e o mapa ganha a área toda;
    - a contagem e a régua passam a contar a área maior;
    - a busca abre pela pílula;
    - o foco vai e volta entre a pílula e o título da lista;
    - com o detalhe aberto, recolher e expandir continuam funcionando;
  - **D7**:
    - o ponto aparece só depois do clique, nada é guardado, e no DevTools nenhuma requisição leva a
      posição;
    - com a posição simulada em movimento (Sensors do DevTools), o ponto anda e o mapa segue;
    - arrastar o mapa para de seguir, e o botão religa;
    - com a aba oculta e visível de novo, o acompanhamento para e volta.

  Validado em 09/11/2026 no `next dev`, com dados de produção:
  - **D4**:
    - em `/postos/[cnpj]`, no computador (1536 px), o detalhe fica num cartão de 336 px à direita
      (16 px da borda), a lista à esquerda e o marcador do posto no meio, fora dos cartões;
    - "Fechar" aponta para `/`, e não há diálogo;
    - no celular (375 px), o detalhe vira a folha de baixo: largura toda, 88% da altura.
  - **D5**:
    - escolher na lista um posto que estava dentro de um grupo aproxima o mapa e centraliza o
      posto no mapa livre, entre a lista e o cartão (x=776);
    - o marcador fica destacado (`aria-current`, maior e com anel);
    - o `Esc` volta para `/` com o foco no item da lista, e o destaque some.
  - **D6**:
    - recolher troca o cartão pela pílula (423 × 48 px) com "368 postos nesta área · Ver lista",
      e o foco vai para a pílula;
    - "Ver lista" põe o foco no título, e a busca da pílula abre a lista com o foco no campo;
    - num zoom mais perto, a contagem passou de 330 para 331 com a lista recolhida.
  - **D7**, com a geolocalização da página trocada por uma falsa, que anda para o norte a cada
    1,5 s, porque a automação não usa o Sensors do DevTools:
    - o ponto aparece só depois do clique, com `aria-pressed="true"`, e o mapa segue (o ponto fica
      parado na tela);
    - arrastar desliga o modo seguir, e o ponto anda na tela (de y=209 para y=153). O botão religa
      sem novo `watchPosition`;
    - com a aba oculta, `clearWatch`; com ela visível de novo, outro `watchPosition`;
    - nenhum armazenamento, cookie ou URL tem a coordenada, e nenhuma das 50 requisições a leva;
    - ponto azul com borda branca e halo de 51 px para 60 m de precisão, legível nos temas claro e
      escuro.
  - Observação: de novo, o `next dev` não gerou as classes e o token novos do Tailwind (o ponto
    saiu sem cor) até ser reiniciado, o mesmo problema da Fase 5.

### D8 — A lista abre e fecha suave no computador (apontado e aplicado em 09/11/2026)

Hoje, "Recolher lista" e "Ver lista" trocam o cartão pela pílula de uma vez: o cartão é escondido
com `display: none`, que não anima.

- [X] T130 Em `components/mapa/TelaMapa.tsx`, trocar o `display: none` por uma transição, no
  computador:
  - o cartão e a pílula ficam sempre montados;
  - ao recolher, o cartão encolhe para o canto (escala 0,95, 12 px para a esquerda) e some em
    300 ms, numa curva que desacelera no fim. A pílula aparece 120 ms depois, deslizando;
  - ao abrir, o caminho inverso;
  - a visibilidade não anima: ao mostrar, ela vira `visible` na hora, e o foco vai para a pílula
    ou para o título como antes; ao esconder, ela só muda no fim, e o elemento sai do Tab e do
    leitor de tela quando termina de sumir;
  - com a lista recolhida, a cobertura da esquerda passa a ser 0, mesmo com o cartão ainda na
    página;
  - com menos movimento (`motion-reduce`), a troca é instantânea.
- [X] T131 Validar no navegador (1536 px):
  - a transição chega ao elemento (`opacity, translate, scale, visibility`; 300 ms, 300 ms,
    300 ms, 0 s);
  - ao recolher, a pílula fica visível e focável no mesmo instante, e o cartão termina com
    opacidade 0, escala 0,95 e invisível;
  - ao abrir, o cartão fica focável na hora e termina com opacidade 1, e a pílula termina
    invisível;
  - 404 testes, typecheck e lint passam.

### D9 — Celular: mapa livre, com uma barra compacta embaixo (apontado em 09/11/2026; decidido no T132)

Hoje no celular (captura do usuário, num iPhone de 375 px com as barras do Safari), a tela tem:
- em cima, a barra do app (logotipo e "Gasolina comum") e a busca flutuante;
- embaixo, a `FolhaResumo` fixa, com o título, a faixa de preços, "Ver lista", as duas primeiras
  linhas da lista e a atribuição.

A folha ocupa mais da metade da tela e não dá para recolhê-la. Sobra uma faixa pequena de mapa,
pior em celulares menores (320 a 375 px de largura e 568 a 667 px de altura).

A folha também guarda coisas que precisam continuar existindo:
- os estados de carregando, vazio ("Ver a região inteira") e erro ("Tentar de novo");
- o botão de localização;
- a atribuição das fontes.

Proposta, inspirada na pílula do computador (D6):
- **Barra compacta embaixo**: uma pílula de vidro fixa acima da área segura
  (`env(safe-area-inset-bottom)`). Ela mostra a contagem com a ação de abrir ("8 postos · Ver
  lista") e o botão de busca. É a única coisa fixa embaixo, e o mapa fica livre;
- **Estados na própria pílula**:
  - carregando: "Buscando os preços…", em `role="status"`;
  - vazio: "Nenhum posto aqui", com "Ver a região inteira";
  - erro: "Não deu para carregar", com "Tentar de novo";
- **Topo limpo**: a barra do app e a busca flutuante saem. O logotipo vai para o topo da lista, e a
  busca abre pelo botão da pílula, como no computador, num campo no topo com o teclado já aberto;
- **Botões redondos**: localização e tema flutuam à direita, logo acima da pílula. A localização
  fica perto do polegar;
- **Atribuição sempre à vista**: o Princípio I exige a fonte numa atribuição permanente e visível
  na mesma tela dos marcadores, que mostram a idade no lugar da data, e o FR-030 exige a do mapa.
  Fica uma linha curta, de 11 px, colada na pílula: "Preços: ANP · Mapa: © OpenStreetMap". O texto
  completo vai na lista;
- **Tocar na pílula abre os postos da área**, de um destes jeitos (decidir no T132):
  - **(a) Folha arrastável com duas alturas** (recomendada): na metade da tela, com o mapa ainda à
    vista em cima, ou em tela cheia. Uma alça serve para arrastar e fechar. Usa o `Drawer` do
    shadcn (biblioteca `vaul`), uma dependência nova que precisa de justificativa no `plan.md`
    (Princípio VI). É o padrão dos apps de mapa;
  - **(b) Sem dependência nova**: a lista abre em tela cheia, como o "Ver lista" de hoje, com "Ver
    mapa" para voltar. É mais simples, mas sem o meio-termo de ver mapa e lista juntos;
- **Área visível**: embaixo, só a pílula (ou a folha na metade, se aberta) cobre o mapa. A contagem
  e a lista passam a considerar muito mais mapa.

- [X] T132 🧭 Antes de implementar, decidir com o usuário e registrar aqui:
  - **(a) ou (b)** para a lista;
  - **com a folha na metade, ela acompanha o mapa?** Ou seja, a lista se atualiza enquanto a pessoa
    move o mapa. Recomendado: sim;
  - **onde fica o botão de tema**: flutuando sobre o mapa ou no topo da lista. Recomendado: no topo
    da lista, para limpar o mapa;
  - **o detalhe do posto no celular** também vira uma folha que abre na metade, com o mapa
    centralizado no posto acima dela? Hoje ele cobre 88% da tela e é modal;
  - **o botão Voltar do Android** fecha a folha? Recomendado: não mexer no histórico; fechar é pela
    alça, arrastando ou pelo botão.

  **Decisões do usuário em 09/11/2026**, todas iguais às recomendações:
  1. lista na opção **(a)**, folha arrastável com duas alturas (metade e tela cheia), com o
     `Drawer` do shadcn (`vaul`);
  2. **sim**, na metade a folha acompanha o mapa;
  3. o botão de tema fica **no topo da lista**;
  4. **sim**, o detalhe do posto no celular abre **na metade da tela**, com o mapa centralizado no
     posto acima dele;
  5. **não**, o botão Voltar do Android não fecha a folha, e o histórico não é usado para ela.
- [X] T133 Escrever os testes primeiro:
  - a pílula na versão do celular: contagem curta, "Ver lista" com `aria-expanded`, busca e os três
    estados, cada um com o papel e a ação certos;
  - o viewmodel do estado da lista, só em memória: `fechada`, `meia` ou `cheia`;
  - foco: abrir a lista põe o foco no título, e fechar devolve o foco à pílula;
  - a atribuição curta fica no documento em todos os estados;
  - o detalhe no celular abre na altura `meia`, sem cobrir o mapa acima dele, e "Fechar" continua
    voltando no histórico como hoje (D1).
- [X] T134 Instalar o `Drawer` do shadcn (`npx shadcn@latest add drawer`, que traz o `vaul`) e
  implementar a barra compacta e o topo limpo, em `components/mapa/TelaMapa.tsx`, numa versão nova
  da pílula em `components/lista/PilulaLista.tsx` e trocando a `components/mapa/FolhaResumo.tsx`:
  - tirar do celular a `BarraApp` e a busca flutuante;
  - a busca abre num campo sobreposto no topo, com o foco nele;
  - só o botão de localização fica flutuando, acima da pílula. O de tema vai para o topo da lista
    (decisão 3);
  - a atribuição curta fica permanente.
- [X] T135 Implementar a lista no celular como `Drawer` com duas alturas (`snapPoints`: metade e
  tela cheia), com alça para arrastar e fechar e sem usar o histórico (decisão 5). Ela leva:
  - no topo, o logotipo e o botão de tema (decisão 3), e depois o cabeçalho de hoje: título, faixa
    de preços, ordem e busca;
  - a paginação do D2;
  - o selo compacto do D3;
  - na metade, o mapa acima continua usável, e a lista acompanha a área visível ao mover o mapa
    (decisão 2). Em tela cheia, a lista cobre o mapa.
- [X] T136 Ajustar o mapa ao novo layout:
  - a cobertura de baixo (`cobertura.inferior`) passa a ser a pílula, ou a folha na metade;
  - o foco no posto do D5, no celular, desconta a folha;
  - o detalhe do posto no celular (`PainelDetalhe` no modo modal) vira um `Drawer` que abre na
    metade da tela, com a opção de arrastar para a tela cheia (decisão 4). Na metade, o mapa acima
    fica visível e usável, como no computador (D1), e centraliza o posto acima da folha.
- [X] T137 Atualizar a documentação:
  - `specs/001-gas-price-map/contracts/ui.md`: a `FolhaResumo` dá lugar à pílula, à lista em
    `Drawer` e ao detalhe na metade da tela no celular;
  - os cenários de celular da seção 6 do quickstart;
  - o `plan.md`, com a justificativa da dependência nova (`vaul`, pelo `Drawer` do shadcn),
    conforme o Princípio VI: alturas e gesto de arrastar acessíveis, que seriam arriscados de
    escrever do zero; licença MIT; sem custo.
- [X] T138 Validar no navegador em 320 × 568, 375 × 667 e 390 × 844 px, nos temas claro e escuro:
  - com tudo fechado, o mapa ocupa pelo menos 80% da altura útil, e a fonte continua visível;
  - abrir, arrastar entre as alturas e fechar a lista funciona, e a lista acompanha o mapa;
  - a busca abre, encontra a cidade e fecha;
  - os estados de carregando, vazio e erro aparecem na pílula;
  - achar o posto mais barato perto em menos de 15 s (SC-004), pelo marcador verde no mapa ou com
    um toque para abrir a lista;
  - leitor de tela e teclado: a ordem do foco e os nomes acessíveis.

  **Validado em 10/11/2026**, no `next dev`, em `iframe`s com o tamanho de cada celular:
  - **Barra compacta**: "402 postos · Ver lista", a busca, o botão de localização na mesma linha e
    a linha das fontes (duas linhas pequenas). A pílula não passa da borda em nenhum tamanho;
  - **Mapa livre**: 82% em 320 × 568, 85% em 375 × 667 e 88% em 390 × 844. Na primeira versão, o
    botão de localização ficava numa linha só para ele, acima da pílula, e o mapa ficava em 77%;
    ele passou para a mesma linha da pílula;
  - **Folha da lista**, em 375 × 667:
    - abre na metade (topo em 50% da tela), com o nome "Postos da área visível", o logotipo, o botão
      de tema e 20 postos;
    - a contagem passa a descontar a metade coberta;
    - o foco vai para o título da lista, e a pílula fica com `aria-expanded="true"`;
    - "Fechar lista" fecha e devolve o foco à pílula;
    - arrastar a alça para cima leva à tela cheia;
    - arrastar a alça para baixo, a partir da metade, fecha (a pílula volta a
      `aria-expanded="false"`);
  - **Busca**: o botão da pílula abre o campo no topo (y=27), com o foco nele e "Cancelar".
    "jaboatao" encontra "Jaboatão dos Guararapes"; escolher fecha o campo, e o mapa vai até lá (402
    para 214 postos);
  - **Detalhe**:
    - escolher um posto na folha da lista fecha a lista e abre o detalhe na metade da tela
      (deslocamento de 333,5 px em 667);
    - o marcador do posto fica destacado e centralizado acima da folha (y=151);
    - "Fechar" volta para `/`, o destaque some, e o foco vai para a pílula, porque o item de origem
      estava na lista, que fechou;
  - **Link direto**: o cartão ocupa a metade de baixo (334 px de 667), com "Fechar" para `/` e o
    marcador destacado acima dele (y=151);
  - **Temas**: claro e escuro, com o mapa na metade de cima e a folha legível na de baixo;
  - **Na primeira tentativa**, a extensão do Chrome desconectou no meio da validação; ela foi
    retomada quando a extensão voltou. O gesto de arrastar foi simulado com eventos de ponteiro,
    e vale conferir num celular de verdade;
  - os estados da pílula (carregando, vazio e erro), o foco e os nomes acessíveis estão nos testes
    do `PilulaCelular`, do `FolhaLista` e do `PainelDetalhe`.

**Checkpoint**: `npm run typecheck`, `npm run lint` e `npm test` passam.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: começa imediatamente. O T009 depende de T001 e T002.
- **Foundational (Fase 2)**: depende do Setup e **bloqueia todas as histórias**.
  - **Testes antes da implementação**: T012 a T021 vêm antes de T022 a T032, e o T039 vem antes
    do T040.
  - **Domínio**: T027 depende de T022 a T025; T028 depende de T026 e T027; T029 depende do
    T027.
  - **Infraestrutura**: T033 depende do T030; T034 depende de T027, T028 e T031; T035 depende
    de T029, T032 e T033; T036 depende de T028, T033 e T034.
  - **Banco e deploy**: o T038 (🙋) depende de T010, T011 e T033 a T037, e da revisão humana
    do diff de todas as tarefas 🔒 anteriores.
  - **Front**: o T041 depende do T038, por causa dos tipos gerados; o T042 depende do T004.
- **US1 (Fase 3)**: depende da Fase 2. O T054 (🙋) depende do T053, e o T063 depende do T054.
- **US2 (Fase 4)**: depende da Fase 2.
  - O T083 usa `calcularVariacao` (T050 e T062), que nasce na US1 porque a lista também mostra
    a variação. Para fazer a US2 antes da US1, faça T050 e T062 primeiro.
  - O T080 (🙋) depende do T079, e o T085 depende do T080.
  - A navegação a partir do mapa (T090) usa os componentes do T069 e do T070, da US1.
  - A rota `/postos/[cnpj]` funciona sozinha.
- **US3 (Fase 5)**: depende da Fase 2 e usa o detalhe da US2 (T083, T088) para aparecer.
- **Polish (Fase 6)**: depende das histórias que forem publicadas.
- **Detalhes (Fase 7)**: depende das Fases 3 a 5, cujas telas ela ajusta. De preferência roda
  antes da Fase 6. Os blocos D1, D2 e D3 são independentes entre si. Dentro de cada bloco, os
  testes vêm antes da implementação. O T118 valida D1 a D3. Os blocos D4 a D7 vieram depois:
  - o D5 aproveita o cartão à direita do D4, então roda depois dele;
  - o D6 está decidido (T124: lista recolhível) e pode rodar;
  - o D7 espera a emenda da constituição (T126).

  O T129 valida D4 a D7. O D8 já foi aplicado. O D9, do celular, já tem as decisões do T132 e
  muda a mesma área do D6 e do D8 (`TelaMapa` e `PilulaLista`), então roda por último.

### User Story Dependencies

- **US1 (P1)**: nenhuma dependência de outras histórias. É o MVP.
- **US2 (P2)**: independente para testar via URL direta, desde que T050 e T062 existam. A
  integração com o mapa (T090) usa a US1.
- **US3 (P3)**: o domínio (T092, T094) e o componente (T093, T096) são independentes. A exibição
  (T097) depende do detalhe da US2.

### Within Each User Story

- Os testes são escritos e **vistos falhando** antes da implementação (Princípio V).
- A ordem é domínio, depois services, depois viewmodels, depois views, depois página.
- Uma migration de RPC é aplicada (🙋) e os tipos são regenerados logo depois de ela ser
  escrita, antes dos services que a chamam.
- As tarefas 🔒 passam por revisão humana do diff. As tarefas 🙋 só rodam com autorização
  explícita.

### Parallel Opportunities

- **Setup**: T003 a T008 em paralelo.
- **Fase 2**:
  - os 10 testes de domínio da ingestão (T012 a T021) e o teste de formatação (T039) em
    paralelo;
  - as implementações T022 a T026, T030 a T032 e T040 em paralelo.
- **US1**: os testes T043 a T052 em paralelo; o domínio T055 a T062 em paralelo; os viewmodels
  T065 a T068 e as views T069 a T073 em paralelo.
- **US2**: os testes T077 e T078 em paralelo; T084 e T087 em paralelo.
- **US3**: T092 e T093 em paralelo; o T095 em paralelo com o T094.
- **Detalhes**: os blocos D1 (T107 a T110), D2 (T111 a T114) e D3 (T115 a T117) em paralelo,
  porque mexem em arquivos diferentes. A exceção é o `components/posto/DetalhePosto.test.tsx`,
  usado pelo T107 e pelo T114, que vão em sequência.

---

## Parallel Example: User Story 1

```bash
# Testes de US1 juntos (devem falhar):
Task: "Escrever features/postos/domain/idade.test.ts (T043)"
Task: "Escrever features/postos/domain/ordenar-lista.test.ts (T044)"
Task: "Escrever features/postos/domain/bbox.test.ts (T045)"
Task: "Escrever features/postos/domain/agrupar.test.ts (T046)"
Task: "Escrever features/postos/domain/rotulos.test.ts (T047)"
Task: "Escrever features/busca/domain/buscar-municipio.test.ts (T048)"
Task: "Escrever features/status-fontes/domain/avaliar-status.test.ts (T049)"
Task: "Escrever features/postos/domain/variacao.test.ts (T050)"
Task: "Escrever components/mapa/MarcadorPosto.test.tsx (T051)"
Task: "Escrever components/lista/ListaPostos.test.tsx (T052)"

# Depois, o domínio de US1 junto:
Task: "Implementar idade.ts (T055)", "ordenar-lista.ts (T056)", "bbox.ts (T057)",
      "agrupar.ts (T058)", "rotulos.ts (T059)", "buscar-municipio.ts (T060)",
      "avaliar-status.ts (T061)", "variacao.ts (T062)"

# Depois, as views independentes juntas:
Task: "MarcadorPosto/MarcadorGrupo (T069)", "ListaPostos (T070)", "BuscaCidade (T071)",
      "BotaoLocalizacao (T072)", "AvisoFonte (T073)"
```

## Parallel Example: Foundational (domínio da ingestão e formatação)

```bash
Task: "cnpj.test.ts (T012)", "preco.test.ts (T013)", "data-serial.test.ts (T014)",
      "regiao-rmr.test.ts (T015)", "xlsx.test.ts (T016)", "lpc.test.ts (T017)",
      "revendedores.test.ts (T018)", "alerta.test.ts (T019)", "lote-precos.test.ts (T020)",
      "retrato-postos.test.ts (T021)", "lib/formato/formato.test.ts (T039)"
```

---

## Implementation Strategy

### MVP First (só a US1)

1. Fase 1 (Setup), seguida da Fase 2 (Foundational), que inclui o 🙋 T038. Os dados ficam no ar
   e passam a ser atualizados sozinhos.
2. Fase 3 (US1), que inclui o 🙋 T054.
3. **Parar e validar**: os cenários de US1 do quickstart.
4. Publicar o MVP (T100, T101 e T102), com o mapa, a lista e os preços com idade.

### Incremental Delivery

1. Setup e Foundational deixam os dados atualizados automaticamente.
2. A US1 entrega o mapa e a lista. Validar e publicar: é o MVP.
3. A US2 entrega o detalhe, o histórico de 12 meses e o link próprio. Validar e publicar.
4. A US3 entrega o Gasosinha. Validar e publicar.
5. Detalhes: os ajustes de experiência apontados pelo usuário, antes do Polish.
6. Polish: a auditoria, as medições do SC-003 e do SC-009 e o README.

### Antes do `/speckit-implement`

- Ter em mãos as credenciais do projeto Supabase (sa-east-1), que T038, T054, T080, T082, T101
  e T104 usam. Não há outro serviço a configurar: o acompanhamento das fontes é pelo aviso do
  site (R15).
- Combinar como a revisão humana dos diffs 🔒 vai acontecer: no pull request ou na conversa com
  o agente (Quality Gates da constituição).

---

## Notes

- **[P]**: arquivos diferentes, sem dependência de tarefa incompleta.
- **[USx]**: liga a tarefa à história, para rastreabilidade.
- **🔒** exige revisão humana do diff. **🙋** exige autorização para executar no ambiente remoto.
- Confirmar que cada teste falha antes de implementar.
- O trabalho é feito direto na `main`, sem branch nem worktree. O agente não commita: o usuário
  commita ao fim de cada fase, com `npm run typecheck`, `npm run lint` e `npm test` passando.
  Se precisar de um commit no meio da fase, o agente pede ao usuário.
- Parar em qualquer checkpoint para validar a história de forma independente.
- Evitar: tarefas vagas, conflito no mesmo arquivo e dependências entre histórias que quebrem a
  independência.
