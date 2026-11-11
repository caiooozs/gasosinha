# Gasosinha

Mapa público e gratuito dos postos de combustível da Região Metropolitana do Recife, com o preço da
gasolina comum em cada posto, a data da coleta, o histórico e quanto o preço subiu ou caiu. Quem
apresenta os dados é o Gasosinha, um mascote em pixel art que reage às variações.

O site mostra todos os postos autorizados pela ANP na região. O preço vem de uma pesquisa semanal
feita por amostragem, então só parte dos postos tem preço, e cada preço aparece sempre com a data
da coleta e a fonte. Posto sem coleta aparece como "sem preço".

## Fontes e atribuição

- **Preços**: ANP, [Levantamento de Preços de Combustíveis](https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas)
  (planilha semanal por posto).
- **Cadastro de postos**: ANP, [API Revendedores](https://revendedoresapi.anp.gov.br/swagger/index.html).
- **Mapa base**: [OpenFreeMap](https://openfreemap.org) © [OpenMapTiles](https://openmaptiles.org)
  © [colaboradores do OpenStreetMap](https://www.openstreetmap.org/copyright).

A atribuição fica sempre visível na tela do mapa. Os dados são públicos, e o Gasosinha não
estima nem completa preços: só mostra coletas reais.

## Arquitetura

A especificação completa está em [`specs/001-gas-price-map/`](specs/001-gas-price-map/):
[spec](specs/001-gas-price-map/spec.md), [plano](specs/001-gas-price-map/plan.md),
[pesquisa](specs/001-gas-price-map/research.md), [modelo de dados](specs/001-gas-price-map/data-model.md),
[contratos](specs/001-gas-price-map/contracts/) e [tarefas](specs/001-gas-price-map/tasks.md). As
regras do projeto estão na [constituição](.specify/memory/constitution.md).

**Site** (Next.js com App Router, React, TypeScript estrito, Tailwind e shadcn/ui; mapa com
MapLibre), organizado em MVVM:

- `app/` e `components/`: as views, que só renderizam o que recebem;
- `features/<nome>/viewmodels`: hooks com TanStack Query que orquestram os dados;
- `features/<nome>/domain`: regras puras e testadas (variação, idade da coleta, ordenação, reação
  do Gasosinha);
- `features/<nome>/services`: o acesso aos dados, com a chave pública do Supabase;
- `lib/formato`: o único módulo que formata moeda, data e percentual, em pt-BR.

**Dados** (Supabase, com Postgres e PostGIS):

- tabelas com RLS de só leitura para o público; a escrita só acontece pela service role;
- RPCs `postos_na_area` (a busca usa só a área visível do mapa) e `detalhe_posto`;
- Edge Functions `sync-postos` (cadastro, toda semana) e `sync-precos` (preços, todo dia),
  agendadas com `pg_cron`. O domínio da ingestão, com validação em zod, fica em
  `supabase/functions/_shared/`;
- `scripts/backfill-precos.ts`: a carga única do histórico de 12 meses.

**Privacidade**: a posição da pessoa só é lida quando ela pede ("usar minha localização"), serve
para centralizar o mapa e mostrar o ponto de "você está aqui", e nunca sai do aparelho nem é
guardada.

## Como rodar

1. Copie o `.env.example` para `.env.local` e preencha a URL e a chave publishable do Supabase. O
   site só usa a chave pública; a service role nunca vai para o `.env` do site.
2. Instale e rode:

   ```bash
   npm ci
   npm run dev
   ```

   O site abre em http://localhost:3000.

## Testes e qualidade

```bash
npm test            # testes unitários (Vitest), incluindo o domínio da ingestão
npm run typecheck   # TypeScript estrito
npm run lint        # ESLint
npm run build       # build de produção (gera as páginas dos postos)
```

As funções que transformam dados têm teste escrito antes da implementação. Nenhuma mudança entra
sem typecheck, lint e testes passando.

## Áreas sensíveis

Estas áreas definem quem pode escrever no banco e qual dado vira preço na tela. Mudanças nelas só
entram depois de revisão humana do diff e com os testes passando (Princípio IX da constituição):

- migrations (`supabase/migrations/`);
- políticas de RLS;
- Edge Functions (`supabase/functions/`);
- importadores de dados (`scripts/backfill-precos.ts`).

Aplicar migrations no banco remoto, publicar Edge Functions ou rodar importadores contra a
produção exige aprovação explícita para aquela ação. Segredos (service role, `CRON_SECRET`) ficam
só nos secrets das Edge Functions e no ambiente do servidor, nunca em variáveis `NEXT_PUBLIC_*`
nem no repositório.
