# Implementation Plan: Gasosinha — Mapa de Preços da Gasolina por Posto

**Branch**: `001-gas-price-map` | **Date**: 2026-10-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-gas-price-map/spec.md`

## Summary

Site público em que o motorista vê, no mapa da Região Metropolitana do Recife, os 403 postos
autorizados. Cada posto mostra o preço da gasolina comum com a idade da coleta, ou "sem preço".
O site oferece uma lista equivalente ao mapa e o detalhe de cada posto, com histórico, variação
em R$ e % e a reação do mascote Gasosinha.

**Abordagem técnica**:
- **Front**: Next.js 16 (App Router, Cache Components) com MVVM:
  - as views ficam em `app/` e `components/`;
  - os viewmodels são hooks TanStack Query em `features/*/viewmodels`;
  - as regras puras ficam em `features/*/domain` e `lib/formato`.
- **Mapa**: MapLibre GL com tiles do OpenFreeMap e marcadores DOM acessíveis, agrupados com
  `supercluster`.
- **Dados**: Supabase (Postgres e PostGIS) com RLS de só leitura.
- **Ingestão**: duas Edge Functions agendadas por `pg_cron`:
  - `sync-postos` lê a API Revendedores da ANP;
  - `sync-precos` lê o arquivo semanal por posto do LPC.

  As duas compartilham parsers puros validados com Zod, os mesmos usados pelo script de carga dos
  12 meses de histórico.

**Achados da pesquisa que mudam o desenho** ([research.md](./research.md)):
- **CNPJ** (R4): o arquivo de preços traz o CNPJ sem zeros à esquerda. Sem normalizar, só 28 de
  81 preços da RMR casam com o cadastro; normalizando, casam 81 de 81.
- **Nomes de arquivo** (R3): os arquivos semanais têm nomes irregulares, então os links são
  descobertos na página e a semana é lida no conteúdo.
- **Parser** (R6): um parser enxuto do XLSX usa cerca de 150 ms de CPU, dentro do limite de 2 s
  da Edge Function.
- **Coordenadas** (R2): o par ANP4C é o mesmo ponto do decimal.

### Ajustes à entrada técnica (com motivo)

| Entrada | Ajuste | Por quê |
|---|---|---|
| Cluster no MapLibre | Marcadores DOM e `supercluster` em função pura | Os marcadores precisam de nome acessível e foco (FR-007, FR-008). Camadas no canvas não oferecem nenhum dos dois (R12). |
| Domínio em `features/<nome>/domain` | O domínio da **ingestão** fica em `supabase/functions/_shared/` | O bundler das Edge Functions só enxerga `supabase/functions/`. O script de carga e o Vitest importam do mesmo lugar (R10). |
| Histórico "gráfico ou lista" | Lista, sem Recharts | A spec só exige lista (FR-014), e uma dependência sem requisito contraria o Princípio VI (R14). |
| Carga pela série histórica | Arquivos semanais do LPC dos últimos 12 meses | Usa o mesmo parser e a mesma validação da sincronização diária. A série semestral fica como plano B documentado (R7). |
| Consulta por área visível | Área quantizada numa grade de 0,02° | Reduz o que os logs revelam sobre onde a pessoa está (Princípio III) e aumenta o reaproveitamento do cache (R13). |
| Detalhe no cliente | Detalhe com `'use cache'` e hidratação pré-renderizável | O link do posto precisa ser indexável (Clarification de 27/10; R11). |

## Technical Context

**Language/Version**:
- TypeScript 5 em modo `strict`;
- Node 24 (front, testes e script de carga);
- Deno, pelo runtime das Edge Functions do Supabase.

**Primary Dependencies**:
- **Front**:
  - Next.js 16.4.3, React 19.3 e Tailwind 4, que já estão no projeto;
  - shadcn/ui;
  - `@tanstack/react-query` 5 (5.40 ou mais recente, por causa da hidratação);
  - `@supabase/supabase-js` 2;
  - `maplibre-gl` e `react-map-gl` (via `react-map-gl/maplibre`);
  - `supercluster`.
- **Ingestão**: `zod` 4 (4.6.6 ou mais recente) e `fflate`.

**Storage**: Supabase Postgres com PostGIS, `pg_cron`, `pg_net` e Vault (plano gratuito,
sa-east-1). Modelo em [data-model.md](./data-model.md).

**Testing**:
- Vitest para o domínio do front e o da ingestão (parsers, CNPJ, preço, idade, variação, reação,
  ordenação, alerta);
- Testing Library com jsdom para os componentes principais;
- validação manual guiada pelo [quickstart.md](./quickstart.md).

**Target Platform**: navegadores modernos de celular e computador, com o site na Vercel (Hobby).
As Edge Functions rodam no Supabase.

**Project Type**: aplicação web, com o front Next.js e o backend gerenciado no Supabase, no
mesmo repositório.

**Performance Goals**:
- mapa utilizável em menos de 3 s em 4G típico simulado (9 Mbps, 170 ms) com CPU 4× mais lenta e
  cache vazio (SC-003);
- nova edição no ar em até 48 h após a publicação (SC-005).

**Constraints**:
- custo zero (Princípio VI);
- Edge Functions com no máximo 2 s de CPU e 256 MB por execução;
- nenhuma posição de usuário sai do aparelho (Princípio III);
- RLS de só leitura em tudo que é público (Princípio II).

**Scale/Scope**:
- 15 municípios e 403 postos;
- cerca de 81 coletas de gasolina comum por semana na RMR, ou seja, cerca de 4,2 mil por ano;
- 2 rotas públicas;
- de centenas a milhares de visitas por dia no MVP.

### Dependências novas (Princípio VI)

| Dependência | Para quê | Alternativa mais simples rejeitada |
|---|---|---|
| `@supabase/supabase-js` | Ler os RPCs e as tabelas com a chave pública | Usar `fetch` direto no PostgREST seria reescrever autenticação e chamadas de RPC. |
| `@tanstack/react-query` | Os viewmodels (Princípio IV), com cache e hidratação do servidor | Hooks próprios com `useEffect` não teriam cache, deduplicação nem hidratação. |
| `maplibre-gl` e `react-map-gl` | Mapa vetorial gratuito, sem Google | Leaflet exigiria tiles raster de terceiros com cota. Ver R5. |
| `supercluster` | Agrupar marcadores DOM acessíveis | O cluster nativo do canvas não é acessível (R12). |
| `zod` 4 | A única biblioteca de validação de schema (Restrições Técnicas). Fica na 4.6.6 ou mais recente: todas as versões anteriores, inclusive a linha 3, têm o alerta alto GHSA-mrhx-c7xc-m3w5 (consumo excessivo de memória ao validar coleções grandes). A troca foi feita em 2026-11-02, antes de existir qualquer schema. | Validar à mão seria propenso a erro e ilegível. |
| `fflate` | Descompactar o XLSX em Deno e em Node | SheetJS é pesado e lento para o limite de CPU (R6). |
| shadcn/ui, preset `radix-nova` (`radix-ui`, `cn`, `class-variance-authority`, `cmdk`, `lucide-react`, `tw-animate-css` e o pacote `shadcn`, que fornece o CSS base) | `Sheet`, `Command` e `Button` acessíveis, com foco gerenciado | Escrever diálogos e combobox acessíveis do zero seria arriscado para o FR-031. |
| Dev: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/dom`, `@testing-library/user-event` e `tsx` (com `@types/node` alinhado ao Node 24) | TDD (Princípio V) e rodar o script de carga em TypeScript | Não há alternativa que cumpra o Princípio V. |

**Ficam de fora**: Recharts, SheetJS, bibliotecas de data, Google Maps e serviços de
geocodificação.

**Serviço externo**: OpenFreeMap (tiles), no plano gratuito (R5). O tema escuro usa o estilo
`dark` do mesmo OpenFreeMap, com os mesmos tiles e a mesma atribuição: não é serviço novo
(identidade "Glass e modo escuro", 2026-11-06). A escolha de tema fica no `localStorage` e é
aplicada por um script inline no `<head>`, sem dependência nova. Não há serviço de e-mail: o
mantenedor acompanha as fontes pelo aviso público do site (R15, decisão revista em 2026-11-02).
Os limites e riscos estão em R16.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constituição v1.1.0 (alterada em 2026-11-02). Na v1.0.0, o Princípio I tinha uma exceção
justificada para o FR-007, que a alteração MINOR eliminou.

| Princípio | Antes da pesquisa | Depois do design | Evidência |
|---|---|---|---|
| I. Dado com origem e data | ✅ (v1.1.0) | ✅ (v1.1.0) | O marcador mostra a idade no lugar da data, como a v1.1.0 permite em espaços compactos: a data completa está no nome acessível, a lista e o detalhe mostram data e fonte, e a atribuição das fontes é permanente na tela do mapa (FR-030). Nada é inventado nem copiado. "Sem preço" é explícito. Zod valida tudo antes de gravar. O artefato de float é aceito só até 10⁻⁹ (R8). |
| II. Segredo fica no servidor | ✅ | ✅ | Os segredos (service role e `CRON_SECRET`) ficam só nos secrets das Edge Functions ou no `.env.local` do script. O navegador usa a chave publishable. Há RLS em todas as tabelas, com `select` público só em `postos`, `precos` e `estado_fontes` (data-model). |
| III. Localização é da pessoa | ✅ | ✅ | A geolocalização só dispara pelo botão e só alimenta o `flyTo`. A posição não vai para estado persistente, URL nem logs. A consulta usa a área quantizada (R13). |
| IV. TypeScript estrito e MVVM | ✅ | ✅ | `strict` e sem `any`. As views (`app/`, `components/`) só renderizam. Os viewmodels (`features/*/viewmodels`) usam TanStack Query. O domínio puro fica em `features/*/domain`, `_shared` e `lib/formato`. O acesso a dados fica em `features/*/services`. A página do posto chama um viewmodel de servidor (R11). |
| V. Teste antes da regra | ✅ | ✅ | As funções de transformação estão listadas no quickstart, seção 1. Os testes são escritos antes, com fixtures reais da ANP. As regras que a ingestão aplica junto com I/O (ligação do lote de preços com os postos, retrato do cadastro, retomada de edição) ficam em funções puras testadas (`lote-precos.ts`, `retrato-postos.ts`). |
| VI. Simples e de custo zero | ✅ | ✅ | Tudo cabe nos planos gratuitos (R16). Não há serviço cobrado por requisição. As dependências estão justificadas na tabela acima. |
| VII. Acessível e mobile-first | ✅ | ✅ | Marcadores DOM com `aria-label`, lista como alternativa completa (preço, data, fonte e variação, FR-010), foco gerenciado no `Sheet`, Gasosinha parado com `prefers-reduced-motion` e informação que nunca depende só de cor (contrato de UI). |
| VIII. Formato brasileiro | ✅ | ✅ | `lib/formato` é o módulo único de formatação. Só o front formata valores; as Edge Functions não formatam nada para exibição. As datas `AAAA-MM-DD` são formatadas sem `new Date()`, e "hoje" é calculado no fuso America/Sao_Paulo. |
| IX. Vibecoding com revisão | ✅ | ✅ | As áreas sensíveis são `supabase/migrations/`, `supabase/functions/` e `scripts/backfill-precos.ts`. No tasks.md, toda tarefa que escreve nessas pastas é marcada 🔒, e toda execução no ambiente remoto (`db push`, `functions deploy`, carga, simulação de falha, deploy na Vercel) é marcada 🙋. |

**Resultado do gate**: **PASSA**, sem exceções.

## Project Structure

### Documentation (this feature)

```text
specs/001-gas-price-map/
├── plan.md              # este arquivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/           # Fase 1
│   ├── supabase-rpc.md
│   ├── edge-functions.md
│   ├── fontes-externas.md
│   └── ui.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
app/                                  # VIEW: rotas e composição, sem buscar nem calcular dados
├── layout.tsx                        # lang="pt-BR", Providers, AvisoFonte e o slot @detalhe
├── providers.tsx                     # QueryClientProvider (padrão do guia do Next)
├── page.tsx                          # "/" mapa + lista + busca + aviso
├── error.tsx                         # erro ao abrir o mapa, com "tentar de novo"
├── @detalhe/                         # slot paralelo: detalhe como modal sobre o mapa
│   ├── default.tsx                   # null
│   └── (.)postos/[cnpj]/             # rota interceptada ao navegar de dentro do site
│       ├── page.tsx
│       └── error.tsx                 # erro dentro do modal, sem derrubar o site
└── postos/[cnpj]/
    ├── page.tsx                      # detalhe indexável (generateStaticParams, generateMetadata)
    ├── error.tsx                     # falha ao carregar, com "tentar de novo"
    └── not-found.tsx

components/                           # VIEW: componentes de apresentação
├── ui/                               # shadcn/ui (sheet, command, button…)
├── mapa/ (TelaMapa, MapaPostos, MapaCarregavel, MarcadorPosto, MarcadorGrupo, BotaoLocalizacao)
├── lista/ (ListaPostos)
├── posto/ (DetalhePosto, PainelDetalhe, HistoricoPrecos)
├── busca/ (BuscaCidade)
├── gasosinha/ (Gasosinha)
└── avisos/ (AvisoFonte, AtribuicaoFontes)

features/
├── postos/
│   ├── domain/                       # idade, variação, ordenarLista, bbox, agrupar, rótulos, detalhe (+ .test.ts)
│   ├── viewmodels/                   # usePostosNaArea, useListaPostos, useDetalhePosto, useHoje, chaves.ts, hoje.server.ts, detalhe-posto.server.ts
│   └── services/                     # postos.service.ts (RPC no cliente), postos.server.ts ('use cache')
├── gasosinha/
│   ├── domain/                       # classificarReacao, textoReacao (+ .test.ts)
│   └── viewmodels/                   # usePrefereMenosMovimento
├── busca/
│   ├── data/municipios-rmr.ts        # 15 municípios + REGIAO_PADRAO (estático)
│   ├── domain/                       # buscarMunicipio, normalizarNome (+ .test.ts)
│   └── viewmodels/                   # useBuscaCidade
├── localizacao/
│   └── viewmodels/                   # useLocalizacao (só centraliza; nada é guardado)
└── status-fontes/
    ├── domain/                       # avaliarStatus (+ .test.ts)
    ├── viewmodels/                   # useStatusFontes
    └── services/                     # estado-fontes.service.ts

lib/
├── formato/                          # módulo único de moeda, data, idade, percentual e variação (+ .test.ts)
├── supabase/ (cliente-navegador.ts, cliente-servidor.ts)
└── hydrate.ts                        # helper de hidratação pré-renderizável (guia do Next)

supabase/                             # ÁREA SENSÍVEL (Princípio IX)
├── config.toml
├── migrations/                       # postgis+tabelas, rls, rpcs, cron (via Vault)
└── functions/
    ├── deno.json                     # import map: zod, fflate (npm:)
    ├── _shared/                      # domínio da ingestão, puro e sem Deno/Node (+ .test.ts e fixtures/)
    │   ├── cnpj.ts, preco.ts, data-serial.ts, xlsx.ts, lpc.ts, revendedores.ts
    │   ├── regiao-rmr.ts, schemas.ts, alerta.ts   # alerta.ts: estado das fontes para o aviso do site
    │   ├── lote-precos.ts, retrato-postos.ts   # regras puras da gravação
    │   └── infra/                    # execucao.ts, ingestao-precos.ts: I/O com o cliente recebido por parâmetro
    ├── sync-postos/index.ts
    └── sync-precos/index.ts

scripts/
├── backfill-precos.ts                # ÁREA SENSÍVEL: carga única de 12 meses (Node + tsx)
├── gerar-sprites-provisorios.mjs     # sprites provisórios do Gasosinha
└── fixtures/recortar-fontes-anp.ts   # gera as fixtures reais da ANP

public/gasosinha/                     # arte do mascote (poses claras e -dark) e os sprites provisórios
vitest.config.mts                     # projetos node (*.test.ts) e jsdom (*.test.tsx); inclui features/, lib/, components/, supabase/functions/_shared/
```

**Structure Decision**: um projeto Next.js na raiz, com o backend Supabase versionado em
`supabase/`. As camadas MVVM seguem a entrada técnica, e o domínio da ingestão vai para
`supabase/functions/_shared/` (R10). O `tsconfig.json` e o `eslint.config.mjs` da raiz excluem
`supabase/functions/sync-*/`, que dependem de APIs do Deno, e mantêm o `_shared/` no type-check.
Dentro de `_shared/`, os imports relativos levam a extensão `.ts`, que o Deno exige; o
`tsconfig.json` liga `allowImportingTsExtensions` para o `tsc` aceitar isso.

**Cache Components e a hora atual**: o Next também pré-renderiza Client Components, e ler a hora
ali quebra o build. Por isso, nenhum componente cliente lê a hora no render: o "hoje" vem de
`hojeParaRender()` (`'use cache'`, `cacheLife('hours')`) e passa por `useHoje`. Na página do
posto, o detalhe é renderizado sem portal, porque o portal do `Sheet` não renderiza no servidor
e o link precisa ser indexável. O `Sheet` fica só para o modal.

**Insumo externo**: a arte do Gasosinha é um insumo de design. A Fase 1 criou sprites
provisórios para não bloquear a implementação, mas a arte final chegou antes da US3. Por isso, as
reações usam as poses dela (subiu → surpreso, caiu → feliz, estável → piscando, neutro →
pensando), com as versões do tema escuro. Cada pose tem um quadro só, então a animação é um
pulinho em degraus feito em CSS.

## Complexity Tracking

Nenhuma violação.

A única exceção da v1.0.0 (Princípio I: o marcador mostra a idade da coleta, "há 7 d", em vez da
data, FR-007) foi resolvida pela alteração MINOR da constituição (v1.1.0, 2026-11-02), que
permite a idade em espaços compactos, com a data no nome acessível e a fonte numa atribuição
permanente.
