# Quickstart: validar o Gasosinha de ponta a ponta

Guia para provar que a feature funciona. Ele mostra os comandos e os resultados esperados; a
implementação vem nas tasks. Os formatos citados estão em [contracts/](./contracts/) e em
[data-model.md](./data-model.md).

> **Princípio IX**: aplicar migrations no projeto remoto, fazer deploy das Edge Functions e rodar
> a carga do histórico contra produção exige **aprovação humana explícita** depois da revisão do
> diff. O agente prepara os comandos, e você decide quando executá-los.

## Pré-requisitos

- **Ferramentas**: Node 24 e npm. Não é preciso instalar a Supabase CLI, porque ela roda com
  `npx supabase`.
- **Supabase**: um projeto no plano gratuito, na região **sa-east-1 (São Paulo)** (R16). Anote a
  URL, a chave publishable (anon) e a secret (service role).
- **Variáveis locais**: arquivo `.env.local`, que não é versionado. O modelo é o `.env.example`;
  lembre-se de liberá-lo no `.gitignore` com `!.env.example`.
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `NEXT_PUBLIC_SITE_URL`: são
    dados públicos.
  - `SUPABASE_SERVICE_ROLE_KEY`: usado **só** pelo script de carga local. Nunca use o prefixo
    `NEXT_PUBLIC_`.

## 1. Qualidade local (deve passar antes de qualquer integração)

```powershell
npm install
npm run typecheck   # tsc --noEmit, sem erros (inclui supabase/functions/_shared)
npm run lint        # sem erros
npm test            # vitest run, todos verdes
```

**Esperado**:
- Os testes de domínio cobrem as funções que transformam dado (Princípio V):
  - **ingestão**: `normalizarCnpj`, `canonicalizarPreco`, o parser do LPC, o schema
    `RevendedorAnp`, `classificarLote`, `decidirEdicao`, `planejarSincronizacaoPostos`,
    `avaliarFonte` e `transicaoEstado`;
  - **formatação**: o módulo `lib/formato`;
  - **front**: `calcularIdade`, `calcularVariacao`, `classificarReacao`, `ordenarLista`,
    `quantizarBbox`, `filtrarNaAreaVisivel` e `avaliarStatus`.
- Os testes de parser usam como fixtures os recortes reais da ANP.

## 2. Banco (área sensível; com sua aprovação)

```powershell
npx supabase login
npx supabase link --project-ref <ref>
```

Antes do `db push`, crie no SQL Editor os 3 segredos do Vault que a migration de cron usa. Os
valores são digitados por você e não vão para o repositório:

- `sync_precos_url`: `https://<ref>.supabase.co/functions/v1/sync-precos`;
- `sync_postos_url`: `https://<ref>.supabase.co/functions/v1/sync-postos`;
- `cron_secret`: o mesmo valor que vai em `CRON_SECRET` na seção 3.

Cada um é criado com `select vault.create_secret('<valor>', '<nome>');`. Depois:

```powershell
npx supabase db push --remote   # aplica as migrations de tabelas, RLS e cron
```

As migrations dos RPCs entram depois, com timestamps maiores, conforme as tasks. Toda migration
nova precisa de um timestamp maior que o da última já aplicada no remoto; senão o `db push`
recusa a migration.

**Esperado**: no SQL Editor, `select postgis_version();` responde. Um `insert` em `postos` feito
com a chave anon falha por causa da RLS, e um `select` com a mesma chave funciona.

## 3. Cadastro de postos

```powershell
npx supabase secrets set CRON_SECRET=<aleatório>
npx supabase functions deploy sync-postos --no-verify-jwt --use-api --import-map supabase/functions/deno.json
curl.exe -X POST "https://<ref>.supabase.co/functions/v1/sync-postos" -H "x-cron-secret: <…>"
```

`SITE_URL` é opcional e pode ser definido depois, com o mesmo `secrets set`, quando o site
estiver publicado na Vercel.

**Esperado**:
- a resposta é `200` com `na_regiao ≈ 403` e `localizacao_invalida ≈ 1`, conforme o
  [contrato](./contracts/edge-functions.md);
- chamar de novo dá `inseridos: 0` e `atualizados: 0` (SC-006).

**Conferências no SQL**:
- `select count(*) from postos where ativo` dá cerca de 403;
- `select count(*) from postos where localizacao is null` dá cerca de 1.

## 4. Preços: carga do histórico e sincronização diária

```powershell
npx tsx --env-file-if-exists=.env.local scripts/backfill-precos.ts --dry-run   # relata as semanas e as contagens, sem gravar
npx tsx --env-file-if-exists=.env.local scripts/backfill-precos.ts             # grava (com sua aprovação)
npx supabase functions deploy sync-precos --no-verify-jwt --use-api --import-map supabase/functions/deno.json
curl.exe -X POST "https://<ref>.supabase.co/functions/v1/sync-precos" -H "x-cron-secret: <…>"
```

**Esperado**:
- O `--dry-run` mostra cerca de 52 semanas dentro da janela, cerca de 81 postos por semana na
  RMR e `sem_posto = 0` na semana de 18 a 24/10/2026. Ele também mostra como `fora_da_janela`
  os arquivos do ano anterior que terminam antes da janela, e lista as semanas que faltam, se
  houver.
- Depois da carga: `select min(data_coleta), max(data_coleta), count(*) from precos` mostra cerca
  de 12 meses.

**Idempotência (SC-006)**:
- rodar o `sync-precos` de novo dá `edicoes: []`, porque toda URL já baixada, inclusive as dos
  arquivos fora da janela, fica registrada em `links_lpc`;
- rodar a carga de novo dá `gravadas: 0` em todas as semanas.

## 5. Agendamento

Os segredos do Vault foram criados na seção 2, e a migration de cron, que é área sensível, foi
aplicada pelo `db push`.

**Esperado**: `select * from cron.job` mostra `sync-precos-diario` e `sync-postos-semanal`.
Depois de um dia, `select * from cron.job_run_details order by start_time desc limit 5` mostra
as execuções com sucesso, e `execucoes_sync` tem linhas novas.

## 6. Front local

```powershell
npm run dev
```

Abra `http://localhost:3000` e confira os cenários abaixo.

| Cenário | Como verificar | Esperado | Requisitos |
|---|---|---|---|
| Mapa inicial | Abrir sem dar permissão de localização | A RMR inteira enquadrada, com grupos e marcadores. Nenhum pedido de permissão ao abrir. | FR-002, FR-003, FR-009 |
| Marcador com preço | Aproximar em Recife | Rótulo `R$ 6,xx · há N d`. O leitor de tela lê o nome, o preço e a data completa. | FR-007, SC-002 |
| Sem preço | Encontrar um posto sem coleta | Forma diferente e o texto "sem preço" | FR-008 |
| Localização | Tocar em "usar minha localização" e permitir, depois negar | Permitindo, o mapa vai para a posição. Negando, aparece um aviso curto e o mapa continua na RMR. Nas ferramentas de desenvolvedor, nenhuma requisição leva coordenadas, só a área quantizada; `localStorage`, cookies e URL ficam sem a posição. | FR-003 a FR-005, Princípio III |
| Busca | Digitar "jaboatao" | Aparece "Jaboatão dos Guararapes", e o mapa vai até lá. "Caruaru" mostra a mensagem de fora da RMR. | FR-006 |
| Celular (D9) | No modo de dispositivo, com 320 × 568, 375 × 667 e 390 × 844 | Com tudo fechado, o mapa ocupa pelo menos 80% da altura, com só a pílula ("N postos · Ver lista" e a busca), o botão de localização e a linha das fontes embaixo. Tocar na pílula abre a lista na metade da tela, com o mapa ainda à vista; arrastar a alça leva à tela cheia ou fecha. A busca abre no topo. Abrir um posto mostra o detalhe na metade da tela, com o posto centralizado acima. | D9, Princípio I, FR-030 |
| Lista | Abrir a lista | Coletas recentes por preço, depois as antigas, depois "sem preço". Inverter a ordem mantém os grupos. Cada item mostra preço, data, idade, fonte e variação (ou "sem coleta anterior"). Coleta antiga tem ícone e o texto "coleta antiga". Só aparecem postos dentro da área visível. | FR-010, FR-011, FR-029 |
| Falha ao carregar | Nas ferramentas de desenvolvedor, colocar a rede em "Offline" e mover o mapa | Mensagem "Não foi possível carregar os postos." com "Tentar de novo". Os postos que já estavam na tela continuam. Voltar a rede e tocar em "Tentar de novo" recarrega. | Casos de borda |
| Detalhe | Selecionar um posto com 2 ou mais coletas | Nome, bandeira, endereço, preço, data, fonte, idade, histórico e variação `±R$ x,xx (±y,y%) desde dd/mm/aaaa` | FR-013 a FR-016 |
| Link | Copiar a URL `/postos/<cnpj>` e abrir numa aba anônima | Abre direto no detalhe, à direita no computador, com a lista à esquerda (D4); atualizar a página com um posto aberto dá o mesmo resultado. Ver o código-fonte mostra o nome e o preço no HTML e na `<title>`. Fechar o detalhe leva ao mapa (`/`), sem sair do site. | FR-013 |
| Link antigo | Abrir `/postos/<cnpj de um posto inativo>` e depois `/postos/00000000000000` | O primeiro mostra o histórico com o aviso de "não consta mais como autorizado". O segundo mostra "posto não encontrado". | Casos de borda |
| Gasosinha | Postos que subiram, caíram, ficaram iguais e com uma só coleta | As reações subiu, caiu, estável e neutro, cada uma com o texto | FR-018, FR-019 |
| Menos movimento | Ativar "reduzir movimento" no sistema e recarregar | O Gasosinha aparece parado, com o mesmo texto | FR-020 |
| Teclado | Navegar só com Tab, Enter e Esc | Todas as funções alcançáveis, com foco visível; ao fechar o detalhe, o foco volta ao item | FR-012, FR-031 |

## 7. Desempenho (SC-003)

No Chrome, abra as ferramentas de desenvolvedor e configure:

- **Network**: um perfil personalizado "4G típico", com 9.000 kbps de download, 9.000 kbps de
  upload e 170 ms de latência;
- **CPU**: lentidão de 4×;
- **cache**: desativado.

Depois, abra o site em produção (Vercel).

**Esperado**: em menos de 3 s os marcadores da área visível estão desenhados e o mapa responde a
arrastar e aproximar. Registre a medição (média de 3 tentativas) no PR.

Pela linha de comando, o mesmo perfil fica assim. Com `devtools`, o Lighthouse ignora `rttMs` e
`throughputKbps`: use `requestLatencyMs` e `downloadThroughputKbps`.

```powershell
npx lighthouse https://gasosinha.vercel.app/ --only-categories=performance --form-factor=mobile `
  --throttling-method=devtools --throttling.requestLatencyMs=170 `
  --throttling.downloadThroughputKbps=9000 --throttling.uploadThroughputKbps=9000 `
  --throttling.cpuSlowdownMultiplier=4 --output=json --output-path=./lh.json
```

O instante dos primeiros marcadores é a marca `gasosinha:marcadores-na-tela` (em "User Timing" no
relatório).

O 4× de CPU pressupõe um computador rápido. Confira o "BenchmarkIndex" no rodapé do relatório
(ou em `environment.benchmarkIndex` no JSON):
- de 1.500 a 2.000, use 4×;
- de 1.000 a 1.500, use 2×;
- acima de 2.000, use um valor maior que 4×.

A regra segue o guia de throttling do Lighthouse, para simular um celular intermediário. Feche
outros programas antes de medir: com pouca RAM livre, o índice cai pela metade.

## 8. Falha de fonte e aviso (FR-027 e SC-008; área sensível, com sua aprovação)

Este teste roda em produção: enquanto ele dura, o aviso de fonte fica visível para o público.

Para simular a falha, troque temporariamente a URL do LPC por uma inválida e chame o
`sync-precos` duas vezes:

```powershell
npx supabase secrets set LPC_PAGINA_URL=https://www.gov.br/anp/pagina-que-nao-existe
```

**Esperado**:
- o aviso, com a data da última atualização bem-sucedida, aparece em `/` e em
  `/postos/<cnpj>`;
- a segunda chamada mantém o problema com a mesma data de início (`estado_fontes.problema_desde`).

Desfaça a mudança com `npx supabase secrets unset LPC_PAGINA_URL` e chame a função de novo.

**Esperado**: o aviso some das duas páginas.

## 9. Acessibilidade e formato

Rode o Lighthouse (Acessibilidade) em `/` e em `/postos/<cnpj>`.

**Esperado**: nenhuma falha de contraste. Os valores aparecem como `R$ 6,59` e as datas como
dd/mm/aaaa em todas as telas (FR-028, FR-031, SC-009).

## 10. Pausa do Supabase (risco R16)

Na primeira semana em produção, confira no painel do Supabase que o projeto não foi marcado como
inativo. Se for, registre a decisão sobre um ping externo gratuito no plan.md.
