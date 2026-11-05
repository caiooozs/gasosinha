# Contrato: Edge Functions de sincronização

As duas funções são **áreas sensíveis** (Princípio IX): só entram em produção depois de
revisão humana do diff, com os testes passando.

## Regras comuns

- **Autenticação**: `POST` com o cabeçalho `x-cron-secret: <CRON_SECRET>`, comparado em tempo
  constante. O deploy é feito com `--no-verify-jwt` (R17).
  - Segredo ausente ou errado: `401`, sem corpo útil e sem executar nada.
  - Método diferente de POST: `405`.
- **Secrets** (definidos com `supabase secrets set`, nunca no repositório):
  - `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`, injetados automaticamente pelo Supabase;
  - `CRON_SECRET`.
- **Configuração opcional, sem segredo** (também definida com `supabase secrets set`):
  - `REVENDEDORES_API_URL` e `LPC_PAGINA_URL`: quando não são definidas, valem as URLs oficiais
    do [research.md](../research.md). Elas existem para simular falha de fonte no quickstart;
  - `SITE_URL`: endereço público do site, usado no `User-Agent` das requisições à ANP
    (`Gasosinha/1.0 (+<SITE_URL>)`). Sem ela, o `User-Agent` fica `Gasosinha/1.0`. Não tem o
    prefixo `NEXT_PUBLIC_`, porque não é variável do front.
- **Toda execução**:
  1. grava uma linha em `execucoes_sync`, mesmo que falhe;
  2. reavalia `estado_fontes` das **duas** fontes com `avaliarFonte` e `transicaoEstado`. É o
     que liga e desliga o aviso público do site (FR-027). Não há notificação ativa (R15).
- **Formato da resposta**: `application/json`. Nunca inclui segredos nem dados internos além das
  contagens.

## `POST /functions/v1/sync-postos` (semanal)

**Fluxo**:

1. `GET revendedoresapi.anp.gov.br/v1/combustivel?uf=PE&numeropagina=N` até `totalPagina` (R1).
2. Valida cada registro com o schema Zod `RevendedorAnp` ([fontes-externas.md](./fontes-externas.md)).
3. Mantém só os 15 municípios da RMR. Normaliza o CNPJ e valida a localização (R2).
4. Lê os postos gravados e aplica `planejarSincronizacaoPostos(gravados, recebidos)`.
5. Se o retrato for válido (contém pelo menos 80% dos ativos gravados; postos novos não contam):
   - insere os novos e atualiza só os que mudaram, com `atualizado_em = agora`;
   - desativa os ausentes do retrato e reativa os que voltaram;
   - não escreve nada nos inalterados.

**Resposta 200**:

```json
{ "ok": true, "fonte": "cadastro", "lidos": 1634, "na_regiao": 403, "inseridos": 0,
  "atualizados": 2, "inalterados": 401, "rejeitados": 0, "localizacao_invalida": 1,
  "desativados": 0, "reativados": 0 }
```

**Idempotência (SC-006)**: chamar duas vezes em seguida dá `inseridos: 0`, `atualizados: 0`,
`desativados: 0` e `reativados: 0` na segunda vez.

**Falhas**:
- **API fora do ar ou HTTP diferente de 200**: `502 { "ok": false, "fonte": "cadastro", "erro":
  "fonte_indisponivel" }`.
- **Envelope inválido ou retrato abaixo de 80%**: `422 { "ok": false, "erro": "formato_inesperado"
  | "retrato_incompleto" }`.

Nos dois casos, nada é desativado e `estado_fontes.cadastro` passa para problema (FR-027).

## `POST /functions/v1/sync-precos` (diário)

**Fluxo**:

1. Baixa a página do LPC e extrai os links `arquivos-lpc/<ano>/revendas*.xlsx` (R3).
2. Calcula o início da janela de 12 meses (`inicioDaJanela`) e aplica
   `selecionarLinksPendentes`:
   - descarta as URLs que já estão em `links_lpc`, as que já tiveram um desfecho final;
   - mantém só os links de `arquivos-lpc/<ano>/` a partir do ano em que a janela começa;
   - ordena do ano mais novo para o mais antigo e pega **no máximo 3** (R6).

   Assim, os arquivos antigos da página, que vão até 2022, não tomam as vagas da edição nova
   (SC-005).
3. Para cada arquivo:
   1. descompacta com `fflate`;
   2. localiza o `PERÍODO` e o cabeçalho e valida as colunas obrigatórias;
   3. filtra Pernambuco, os municípios da RMR e `GASOLINA COMUM`;
   4. valida cada linha com Zod (`LinhaLpc`) e aplica `normalizarCnpj` e `canonicalizarPreco`;
   5. converte a data serial e confere se ela está dentro do `PERÍODO`;
   6. rejeita conflitos dentro do mesmo arquivo;
   7. aplica `decidirEdicao` à edição do mesmo `PERÍODO`: já concluída ou fora da janela →
      pula; `PERÍODO` que termina antes da janela → registra como `fora_da_janela`, sem preços,
      e pula; em andamento → retoma com o mesmo `id`; nova → registra como `em_andamento`;
   8. aplica `classificarLote` contra as coletas já gravadas e os CNPJs de `postos`: marca
      `conflito_com_existente` e conta `sem_posto` e `ja_existentes`;
   9. faz upsert das linhas novas com `on conflict do nothing`;
   10. só então marca a edição como `concluida`, com `processada_em` e `contagens`;
   11. registra a URL em `links_lpc`. Nos desfechos "já processada" e "fora da janela" do passo
       7, a URL também é registrada, para não ser baixada de novo.
4. Atualiza `estado_fontes.precos.ultima_edicao_fim` e reavalia o atraso de 14 dias.

**Resposta 200**:

```json
{ "ok": true, "fonte": "precos",
  "edicoes": [ { "periodo": "2026-10-18/2026-10-24", "linhas": 20926, "na_regiao": 81,
                 "gravadas": 81, "ja_existentes": 0, "rejeitadas": 0, "sem_posto": 0 } ],
  "pendentes": 0 }
```

Uma edição fora da janela aparece em `edicoes` como `{ "periodo": "…", "fora_da_janela": true }`,
sem contagens de preço.

Se não houver edição nova, a resposta é `200 { "ok": true, "edicoes": [], "pendentes": 0 }`. Isso
não conta como falha, mas o atraso continua sendo avaliado.

**Idempotência (SC-006)**: chamar duas vezes em seguida devolve `edicoes: []` na segunda vez.
Forçar o reprocessamento da mesma edição pelo script de carga dá `gravadas: 0` e
`ja_existentes: N`.

**Interrupção (FR-022)**: se a execução cair depois de registrar a edição e antes de concluí-la,
a edição fica `em_andamento`, e a próxima execução a retoma sem duplicar nada.

**Falhas**:
- **Página ou arquivo inacessível**: `502`.
- **Cabeçalho ou colunas fora do esperado, ou `PERÍODO` ilegível**: `422 { "ok": false, "erro":
  "formato_inesperado", "url": "…" }`. A edição **não** é registrada, então a próxima execução
  tenta de novo (FR-022).

## Agendamento (migration `20261028120200_cron.sql`; área sensível)

- Os 3 segredos do Vault (`sync_precos_url`, `sync_postos_url` e `cron_secret`) precisam existir
  antes de aplicar a migration.
- `cron.schedule('sync-precos-diario', '0 12 * * *', …)` (09:00 em Brasília).
- `cron.schedule('sync-postos-semanal', '0 9 * * 1', …)` (segunda-feira, 06:00 em Brasília).
- A chamada é `net.http_post`, com a URL e o `x-cron-secret` lidos de `vault.decrypted_secrets`.
  Nenhum segredo fica escrito na migration.
