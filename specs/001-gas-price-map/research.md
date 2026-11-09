# Research: Gasosinha — Mapa de Preços da Gasolina por Posto

**Data**: 2026-10-27 | **Plano**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

As fontes da ANP foram consultadas de verdade em 27/10/2026: a API Revendedores e os arquivos
semanais e semestrais de preço. Os números abaixo vêm dessas leituras, não de suposição. Os
scripts de sondagem ficaram fora do repositório.

---

## R1. API Revendedores da ANP: formato, paginação e limites

**Decisão**: o `sync-postos` faz **uma única requisição**
`GET https://revendedoresapi.anp.gov.br/v1/combustivel?uf=PE&numeropagina=1` e filtra os 15
municípios da RMR no próprio código. Ele só busca a página seguinte se `totalPagina` for maior
que 1.

**Fatos verificados**:

- **Parâmetros**, segundo o Swagger em `/swagger/v1/swagger.json`: `cnpj`, `uf`, `municipio` e
  `numeropagina`, todos opcionais. Também existe `/v1/glp`, que fica fora do escopo.
- **Envelope da resposta**:
  `{ status, title, succeeded, data: [...], searchPageFilter: { numeroPagina, tamanhoPagina: 5000,
  totalRegistro, totalPagina } }`. Uma página além da última responde `"title": "Nenhum dado
  encontrado"`, sem `data`.
- **Volume**: Pernambuco inteiro tem 1.634 postos, que cabem numa página só (1,8 MB em cerca de
  1,6 s). A RMR tem **403 postos**: Recife 197, Jaboatão 51, Olinda 36, Paulista 34, Cabo 15,
  Goiana 12, Camaragibe 11, Igarassu 10, Ipojuca 10, Abreu e Lima 9, São Lourenço 7, Moreno 4,
  Araçoiaba 3, Itamaracá 2 e Itapissuma 2.
- **Campos por posto**:
  - identificação: `codigoSIMP`, `autorizacao`, `dataPublicacao`, `razaoSocial`, `cnpj` (14
    dígitos, sem máscara);
  - endereço: `endereco`, `complemento`, `bairro`, `cep`, `uf`, `municipio` (MAIÚSCULAS, sem
    acento, ex.: `JABOATAO DOS GUARARAPES`);
  - bandeira: `distribuidora` (ex.: `VIBRA`, `BANDEIRA BRANCA`) e `dataVinculacao`;
  - instalação: `classe` e `produtos[]` (`produto`, `tancagem`, `qtdeBicos`);
  - localização: `latitude`, `longitude`, `latitude_ANP4C`, `longitude_ANP4C`, `validacao`,
    `estimativaAcuracia`, `srid` (4674), `src` (SIRGAS2000), `dataObtencao`, `origemInformacao`;
  - situação: `situacaoConstatada`, `statusSIGAF`, `observacao` e `inadimplenciaPMQC[]`.
- **Limites**: nenhum limite de taxa documentado nem cabeçalho de quota (a API está atrás de
  Cloudflare). Como uma chamada por semana basta, o risco é baixo. A requisição envia um
  `User-Agent` identificável e não tenta repetir em rajada.
- A resposta lista apenas revendedores **autorizados**. Um posto que some da lista perdeu a
  autorização (FR-026).

**Proteção contra resposta parcial**: o `sync-postos` só marca postos como inativos se o
retrato atual da RMR tiver pelo menos 80% dos postos ativos no banco. Uma resposta vazia ou
truncada vira falha da fonte (FR-027) em vez de "fechar" os postos (Princípio I).

**Alternativas consideradas**:
- 15 chamadas, uma por município, com `municipio=`: são mais requisições e dependem da grafia
  exata do município. Rejeitada.
- Arquivo de dados abertos do cadastro: a API já é estruturada e atual. Rejeitada.

## R2. Coordenadas: decimal ou ANP4C, e a estimativa de acurácia

**Decisão**: usar `latitude` e `longitude` em decimal, gravadas como
`geography(Point, 4326)`. Os campos ANP4C, a acurácia e a origem são guardados apenas como
informação, sem filtrar postos.

**Fatos verificados**:

- `latitude_ANP4C` e `longitude_ANP4C` são **o mesmo ponto** em graus, minutos e segundos (ex.:
  `-08:03:44,856`). Nos 402 postos da RMR com coordenada, a diferença máxima entre as duas
  notações foi de 1,4 × 10⁻⁷ grau, cerca de 2 cm.
- O sistema de referência é SIRGAS2000 (SRID 4674). Na prática, ele coincide com WGS84 (4326) com
  diferença abaixo de 1 m. Gravar como 4326, sem reprojetar, é aceitável para um mapa de postos.
- `validacao` vale `"Posição Geográfica não validada"` em **100%** dos postos da RMR.
- `estimativaAcuracia` traz valores de `1` a `9`, ou vazio. Vazio coincide com
  `origemInformacao = "Preposto da empresa"`, ou seja, a posição foi declarada pelo próprio posto
  (79 de 80 casos). Os valores numéricos vêm de "Agente de fiscalização da ANP". **A semântica
  não está documentada publicamente**: a busca não encontrou definição, e o manual do app ODK da
  ANP não pôde ser lido como texto.
- 1 posto da RMR (CNPJ `05648920000134`) vem sem coordenada. Ele fica fora do mapa e é
  contabilizado, conforme o caso de borda da spec.

**Tratamento**: a acurácia não é usada para esconder postos, porque o SC-001 exige todos os
postos com localização válida e o significado do campo é desconhecido. A localização é
considerada válida quando os dois números existem e caem dentro do retângulo envolvente da
RMR com 0,05° de margem. Fora disso, o posto não aparece no mapa e é contabilizado como
"localização inválida". O valor bruto de acurácia é guardado para uma decisão futura.

**Alternativas consideradas**:
- Converter o ANP4C: redundante, porque o resultado é o mesmo ponto. Rejeitada.
- Filtrar por acurácia: o campo não tem semântica conhecida e esconderia postos reais. Rejeitada.
- Geocodificar pelo endereço: seria serviço cobrado (Princípio VI) e desnecessário, porque o
  cadastro já traz as coordenadas. Rejeitada.

## R3. Onde e com que frequência a ANP publica preço por posto, e em que formato

**Decisão**: a fonte de preços é o **arquivo semanal por posto do LPC**, publicado na página
"Levantamento de Preços de Combustíveis – últimas semanas pesquisadas". Ele serve tanto para a
sincronização diária quanto para a carga do histórico.

**Fatos verificados**:

- **Página**:
  `https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas`
  (cerca de 450 KB de HTML). Ela lista links `.../arquivos-lpc/<ano>/revendas_lpc_*.xlsx` desde
  2022, ao lado dos `resumo_semanal_*`.
- **Frequência**: semanal (domingo a sábado). A semana de 18 a 24/10/2026 já estava no ar em
  26/10/2026, ou seja, cerca de 2 dias depois do fim da semana. A coleta diária cumpre o SC-005
  (48 h).
- **Os nomes dos arquivos não são estáveis**, então não dá para montar a URL a partir da data:
  - `revendas_lpc_2026-10-04_2026-10-10.xlsx` é o padrão mais comum;
  - `revendas_lpc_2026_10_18-2026_10_24.xlsx` usa sublinhados;
  - `revendas_lpc-17112025-a-23112025.xlsx` usa outro formato de data;
  - `revendas_lpc-1.xlsx` e `revendas_lpc.xlsx` nem trazem data.

  O sistema **descobre os links lendo a página** e **identifica a semana pelo conteúdo**
  (linha `PERÍODO: 18/10/2026 A 24/10/2026`).
- **Formato do arquivo**: XLSX de cerca de 1,9 MB, com uma aba `POSTOS REVENDEDORES` de 20.934
  linhas, cobrindo o Brasil e todos os produtos.
  - **7 primeiras `<row>`**: metadados (`PERÍODO`, `COMBUSTÍVEL: TODOS`, etc.). O arquivo pula
    as linhas 4 e 9 da planilha, então o `PERÍODO`, 5ª `<row>`, tem `r="6"`.
  - **8ª `<row>` (cabeçalho, `r="10"`)**: `CNPJ | RAZÃO | FANTASIA | ENDEREÇO | NÚMERO | COMPLEMENTO |
    BAIRRO | CEP | MUNICÍPIO | ESTADO | BANDEIRA | PRODUTO | UNIDADE DE MEDIDA | PREÇO DE
    REVENDA | DATA DA COLETA`.
  - **`ESTADO`**: vem por extenso (`PERNAMBUCO`).
  - **`PRODUTO`**: `GASOLINA COMUM`, `GASOLINA ADITIVADA`, `ETANOL`, `DIESEL S10`, `DIESEL S500`,
    `GNV` ou `GLP`.
  - **`DATA DA COLETA`**: número serial do Excel, com base em 1899-12-30 (ex.: `46314` =
    19/10/2026).
- **Recorte da RMR na semana de 18 a 24/10/2026**:
  - 81 postos com `GASOLINA COMUM`, em 7 dos 15 municípios: Recife 28, Jaboatão 13, Olinda 10,
    Paulista 9, Igarassu 8, Cabo 7 e Goiana 6;
  - 0 duplicatas de posto e data;
  - coletas de 19 a 22/10;
  - preços de R$ 6,80 a R$ 6,99.
- **Série histórica (dados abertos)**:
  `.../centrais-de-conteudo/dados-abertos/arquivos/shpc/dsas/ca/ca-AAAA-0S.zip`, publicada por
  semestre. O mais recente é `ca-2026-01.zip` (8,5 MB, com CSV de 72 MB e 422 mil linhas).
  - **Arquivo**: CSV com `;`, UTF-8 com BOM.
  - **CNPJ**: com máscara e espaço inicial (`" 01.492.748/0003-83"`).
  - **Produto**: a gasolina comum aparece como `GASOLINA`.
  - **Data**: `dd/mm/aaaa`.
  - **Preço**: com vírgula (`7,97`).

**Alternativas consideradas**:
- Usar a série histórica semestral como fonte principal: ela é atualizada só por semestre e não
  serve para a sincronização diária. Rejeitada.
- Usar as duas fontes: seriam dois parsers e duas regras de normalização para o mesmo dado.
  Rejeitada por simplicidade (Princípio VI). A série semestral fica como **plano B**, documentado
  e não implementado, caso faltem semanas no LPC (ver R7).

## R4. O CNPJ casa entre cadastro e preços?

**Decisão**: normalizar todo CNPJ com uma única função pura, `normalizarCnpj(bruto)`, testada
antes da implementação (Princípio V):

1. remover tudo que não for dígito;
2. completar com zeros à esquerda até 14 dígitos;
3. rejeitar se o resultado tiver mais de 14 dígitos ou se os dígitos verificadores forem
   inválidos.

A ligação entre preço e posto é feita pela igualdade dos CNPJs normalizados.

**Fatos verificados**:

- **Cadastro (API)**: o CNPJ vem como string de 14 dígitos, sem máscara (403 de 403 na RMR).
- **LPC semanal**: o CNPJ vem como **número, sem zeros à esquerda**. A semana tem 10.482 CNPJs
  com 14 dígitos, 9.610 com 13, 782 com 12 e 41 com 11.
- **Série histórica (CSV)**: o CNPJ vem com máscara e espaço inicial.
- **Resultado do casamento na RMR (semana de 18 a 24/10)**:
  - **sem completar zeros**: só **28 de 81** casam;
  - **com zeros à esquerda**: **81 de 81** casam com postos do cadastro.

**Alternativas consideradas**:
- Casar pelo endereço ou pela razão social: ambíguo e sujeito a erro, o que violaria o
  Princípio I. Rejeitada.
- Comparar sem normalizar: perderia 65% das coletas. Rejeitada.

## R5. Provedor de tiles no plano gratuito, com o volume esperado

**Decisão**: **OpenFreeMap** (`https://tiles.openfreemap.org/styles/positron`, estilo claro, que
dá contraste aos marcadores), usado com MapLibre GL. O **plano B** documentado é um recorte
PMTiles da RMR (Protomaps), servido como arquivo estático.

**Justificativa**:

- O OpenFreeMap não tem limite de visualizações nem de requisições, não exige chave, cadastro ou
  cookie, permite uso comercial (FAQ) e usa dados OpenStreetMap com atribuição no próprio estilo.
- Pelos termos de uso, o serviço é "as-is" e pode ser descontinuado sem aviso. O que é proibido
  é baixar tiles em massa, o que não se aplica a um mapa interativo comum.
- **Volume esperado no MVP**: algo entre algumas centenas e alguns milhares de visitas por dia na
  RMR. Isso já estoura os planos gratuitos com cota:
  - **MapTiler Free**: 5.000 sessões e 100 mil requisições por mês, só para uso não comercial, e
    o serviço pausa quando a cota acaba;
  - **Stadia Free**: 200 mil créditos por mês, proíbe uso comercial e não tem excedente.
- **Plano B**: o recorte da RMR em PMTiles tem algumas dezenas de MB e não depende de terceiros.
  Ele pode ser servido pela Vercel, dentro da banda do plano Hobby. Fica documentado para o caso
  de o OpenFreeMap sair do ar.

**Alternativas consideradas**:
- Google Maps: proibido na entrada do plano e cobrado por uso. Rejeitada.
- MapTiler ou Stadia no plano gratuito: cota baixa ou vedação a uso comercial. Rejeitadas.
- Começar já com PMTiles próprio: exige gerar e atualizar o recorte. Fica adiado por
  simplicidade.

## R6. O parser do XLSX cabe na Edge Function?

**Decisão**: sim, desde que o parser seja **enxuto**. O arquivo é descompactado com `fflate`
(JavaScript puro, cerca de 8 KB, funciona em Deno e Node), e as linhas são extraídas do XML da
planilha e de `sharedStrings` por funções puras próprias, testadas com amostras reais. **Não**
usar SheetJS ou bibliotecas equivalentes.

**Fatos verificados**:

- **Limites da Edge Function no plano gratuito**: 2 s de CPU por requisição (sem contar I/O
  assíncrono), 256 MB de memória e 150 s de tempo total.
- **Tamanho do arquivo semanal descompactado**: `sheet1.xml` tem 12,9 MB e `sharedStrings.xml`
  tem 0,8 MB, com 20.636 strings.
- **Medição local** (V8, Node 24) de descompactar e extrair as 20.934 linhas, filtrando
  Pernambuco e gasolina comum:
  - **CPU**: 126 a 188 ms;
  - **memória**: cerca de 14 MB de heap.

  A Edge Function usa o mesmo V8 no Deno, então há folga de cerca de 10× no limite de CPU.
- O `sync-precos` processa **no máximo 3 edições por execução**, para continuar abaixo de 2 s de
  CPU. Um atraso maior de uma vez é coberto pela carga do histórico. Para que os arquivos antigos
  da página (desde 2022) não ocupem essas 3 vagas, só entram os anos a partir do início da
  janela de 12 meses, do mais novo para o mais antigo, e um arquivo fora da janela é registrado
  como `fora_da_janela` depois de baixado uma vez.

**Alternativas consideradas**:
- SheetJS: pesado e lento para 13 MB de XML dentro do limite de 2 s. Rejeitada.
- Rodar a sincronização num GitHub Actions agendado: não teria limite de CPU, mas acrescentaria
  outra plataforma. Fica como **plano B** se a medição em produção ultrapassar 1 s de CPU.

## R7. Carga do histórico (12 meses, FR-017)

**Decisão**: o script único `scripts/backfill-precos.ts`, rodado localmente com Node, lê a
página do LPC e baixa os arquivos semanais `revendas_lpc*` cujo `PERÍODO` cai nos 12 meses
anteriores ao lançamento. Ele grava pelo **mesmo caminho de código** do `sync-precos`, o que
inclui os mesmos parsers, a mesma validação e o mesmo upsert idempotente. No fim, ele relata as
semanas que faltam.

**Justificativa**:

- É um parser só, para os dois usos (Princípio VI). A página lista 52 links em 2025 e todas as
  semanas de 2026 até 24/10.
- Os nomes irregulares de 2025 são resolvidos lendo o `PERÍODO` dentro de cada arquivo.
- O volume é pequeno: cerca de 81 postos por semana × 52 semanas dá aproximadamente 4,2 mil
  coletas na RMR.
- Se o relatório mostrar semanas faltando, a decisão de importar a série semestral (plano B do
  R3) é tomada com dados. Uma semana faltando é só ausência de coleta, nunca algo a estimar
  (Princípio I).

**Alternativas consideradas**:
- Importar `ca-2025-02` + `ca-2026-01` + as semanas de julho a outubro de 2026: exigiria dois
  parsers e duas fontes com a mesma informação. Rejeitada por ora.

## R8. Normalização do preço e casas decimais

**Decisão**: a função pura `canonicalizarPreco(bruto)` funciona assim:

1. interpreta o texto como decimal, sem passar por `float`;
2. arredonda para 3 casas;
3. **aceita apenas se a diferença para o valor bruto for menor que 10⁻⁹**, ou seja, se for um
   artefato de ponto flutuante. Caso contrário, rejeita e contabiliza;
4. exige 0 < preço < 50 e unidade `R$ / litro`.

O preço é gravado como `numeric(6,3)`. Ele é exibido com 2 casas, ou com 3 se a terceira não
for zero (FR-028).

**Fatos verificados**:

- 891 preços da semana vêm com 16 casas (ex.: `4.8499999999999996`). Arredondados para 3 casas,
  a diferença máxima é de 9 × 10⁻¹⁶: são artefatos de ponto flutuante, não preços de 3 casas.
- Também aparecem preços sem casas (`100`, de GLP) e com 1 casa (`6.5`).
- Na gasolina comum do Brasil inteiro naquela semana, **não houve preço real com 3 casas**.

**Princípio I**: tratar o artefato não é "arredondar para outro valor", porque o valor
representado é o mesmo. Qualquer diferença maior que 10⁻⁹ é rejeitada, nunca ajustada.

## R9. Nomes canônicos de produto e município

**Decisão**:

- **Produto**: o tipo canônico interno é `gasolina_comum`. Ele é mapeado de `GASOLINA COMUM` (LPC
  semanal), `GASOLINA C COMUM` (cadastro) e `GASOLINA` (CSV semestral, plano B). As outras
  linhas do LPC são ignoradas, não rejeitadas, porque estão fora do escopo.
- **Município**: comparado por um nome normalizado (sem acento, maiúsculas, espaços aparados)
  contra a lista fixa dos 15 municípios da RMR. Nas duas fontes os nomes já vêm sem acento.
- **Bandeira**: o campo `distribuidora` do cadastro (ex.: `VIBRA`, `BANDEIRA BRANCA`). Se vier
  vazio, a tela mostra "bandeira não informada".

**Observação**: 8 dos 403 postos da RMR não listam `GASOLINA C COMUM` entre os produtos no
cadastro. Eles continuam no mapa como "sem preço", conforme a spec ("todos os postos
autorizados"), e não há regra nova para eles.

## R10. Código compartilhado entre Edge Functions, script de carga e testes

**Decisão**: o domínio da ingestão fica em `supabase/functions/_shared/`. Isso inclui os parsers,
`normalizarCnpj`, `canonicalizarPreco`, os schemas Zod e a máquina de estados de alerta. São
módulos TypeScript **sem APIs de Deno nem de Node**, só Web APIs. Assim:

- as Edge Functions importam esses módulos por caminho relativo (convenção `_shared` do
  Supabase);
- `scripts/backfill-precos.ts`, que roda em Node com `tsx`, importa os mesmos arquivos;
- o Vitest testa esses arquivos diretamente.

`zod` e `fflate` são resolvidos pelo `node_modules` no Node e pelo `supabase/functions/deno.json`
(import map com `npm:`) no Deno.

**Justificativa**: o bundler das Edge Functions só enxerga `supabase/functions/`. Deixar o
domínio em `features/` obrigaria a duplicar código.

**Consequência no tsconfig e no ESLint da raiz**: as entradas das Edge Functions
(`supabase/functions/sync-*/index.ts`, que usam `Deno.serve`) são excluídas do type-check do
Next. O `_shared` continua incluído, o que garante que ele não usa nada específico de Deno.

## R11. Página do posto indexável (FR-013) com Cache Components e TanStack Query

**Decisão**: o padrão é o guia "TanStack Query" do Next 16.4 instalado
(`node_modules/next/dist/docs/01-app/02-guides/client-side-data-fetching/tanstack-query.md`):

- **Leitura no servidor**: `features/postos/services/postos.server.ts` exporta
  `buscarDetalhePosto(cnpj)`, com `'use cache'`, `cacheLife('hours')` e
  `cacheTag('posto:<cnpj>')`.
- **Hidratação**: o helper de hidratação pré-renderizável do guia monta o estado com
  `updatedAt` vindo do cache, em vez de chamar `dehydrate()`, porque `dehydrate()` lê
  `Date.now()` e quebra o prerender. A página entrega esse estado ao `<HydrationBoundary>`.
- **Cliente**: a view usa o viewmodel `useDetalhePosto(cnpj)`, que chama `useSuspenseQuery` com a
  mesma chave. A leitura do `params` fica dentro de `<Suspense>`.
- **`generateStaticParams`**: devolve os CNPJs dos postos ativos da RMR, cerca de 403. Com Cache
  Components, uma lista vazia **quebra o build**, segundo a documentação. Postos novos são
  renderizados sob demanda e passam a ficar em cache depois disso.
- **`generateMetadata`**: usa `'use cache'`. O título é o nome do posto e a descrição traz o preço
  com a data da coleta (Princípio I), para os buscadores.

**MVVM (Princípio IV)**: `app/postos/[cnpj]/page.tsx` só compõe a página. A busca e a montagem
do estado ficam em `features/postos/viewmodels/detalhe-posto.server.ts`, que a página chama. Os
componentes de `components/` não buscam dados.

**Alternativas consideradas**:
- Detalhe só no cliente: não seria indexável e contrariaria a Clarification de 2026-10-27.
  Rejeitada.
- Invalidar o cache sob demanda a partir do `sync-precos`: exigiria um Route Handler com
  segredo. Os dados mudam por semana, então revalidar de hora em hora basta. Rejeitada por
  simplicidade.

## R12. Marcadores acessíveis e agrupamento

**Decisão**: os marcadores são **elementos DOM** (`<Marker>` do `react-map-gl/maplibre`), cada um
um `<button>` com nome acessível no formato "Posto X, gasolina comum R$ 6,59, coletado em
20/10/2026". O agrupamento é calculado por `supercluster`, a mesma biblioteca que o MapLibre usa
internamente, dentro de uma função pura de domínio testável. Os grupos também são botões ("12
postos, aproximar").

**Justificativa**:

- O FR-007 exige que o nome lido por leitores de tela inclua a data completa, e o FR-008 exige
  diferenciação que não dependa só de cor. Marcadores desenhados como camadas no canvas (camada
  de símbolos com `cluster: true`) não têm nome acessível nem recebem foco.
- O volume máximo é de 403 marcadores DOM, o que não pesa.

**Alternativas consideradas**:
- Agrupamento nativo do MapLibre com camadas de símbolo: o desempenho seria ótimo, mas os
  marcadores ficariam inacessíveis. Rejeitada.
- Marcadores DOM sem agrupamento: ilegível com o zoom afastado (FR-009). Rejeitada.

## R13. Consulta por área visível: bounding box quantizada

**Decisão**: o RPC `postos_na_area` recebe a área visível **expandida para fora numa grade de
0,02°** (cerca de 2,2 km), calculada pela função pura `quantizarBbox`. A posição da pessoa nunca
é enviada (Princípio III).

**Justificativa**:

- Com o mapa centralizado na pessoa e com zoom alto, a área exata praticamente revela onde ela
  está, e essa área aparece nos logs do Supabase e da Vercel. A grade reduz essa precisão.
- A grade também faz com que pequenos arrastes reutilizem a mesma chave de consulta no TanStack
  Query, o que significa menos requisições e menos tráfego.

**Alternativa considerada e rejeitada**: baixar os 403 postos da RMR de uma vez e filtrar no
cliente. Seria mais simples e não revelaria nada da área vista. Ficou rejeitada porque a entrada
do plano define explicitamente a consulta por área visível via RPC, e porque a consulta por área
continua funcionando se a região crescer. Fica registrada caso o tráfego do Supabase vire
problema.

## R14. Histórico do posto: lista, e gráfico das coletas recentes (revisto em 2026-11-09)

**Decisão**: o histórico é uma **lista** de coletas (data e valor), da mais recente para a mais
antiga (FR-014). Nenhum gráfico entra no MVP, então não entram nem o componente de gráfico do
shadcn nem o Recharts.

**Justificativa**: a entrada do plano dizia "gráfico ou lista, conforme a clarify". A spec
fechada só exige a lista. Um gráfico acrescentaria uma dependência sem requisito que a sustente
(Princípio VI), e com coletas esparsas por posto ele teria poucos pontos.

**Revisão (2026-11-09)**: a lista continua, completa, e continua sendo o histórico do FR-014.
Acima dela entra um gráfico em degraus das **até 8 coletas mais recentes**, e embaixo dele uma
grade com a variação de cada coleta para a anterior. O gráfico é um SVG desenhado à mão, sem
nenhuma dependência nova (nada de Recharts nem do componente de gráfico do shadcn). Ele só liga
coletas reais e não interpola nem estima nenhum valor (Princípio I). A posição dos pontos vem de
`features/postos/domain/historico.ts`, que é puro e testado. Para leitores de tela, o gráfico tem
`role="img"` e a lista de valores no nome acessível. A lista logo abaixo é a alternativa a ele.

## R15. Como o mantenedor fica sabendo de falhas (FR-027)

**Decisão (revista em 2026-11-02)**: **não há notificação ativa**. O mantenedor acompanha as
fontes pelo aviso público do site (FR-027), alimentado pela tabela `estado_fontes`, e pelo
registro em `execucoes_sync`. As Edge Functions só atualizam o estado de cada fonte com a função
pura `transicaoEstado`:

- ok → problema: marca o problema, com o tipo (falha ou atraso) e a data de início;
- problema → problema: mantém a data de início;
- problema → ok: limpa o problema, e o aviso some.

**Justificativa**: o site já mostra o aviso para todo visitante. Dispensar a notificação tira um
serviço externo, dois segredos e a lógica de "um e-mail por problema" (Princípio VI). O risco
aceito é demorar a perceber uma falha. Isso inclui a pausa do projeto por inatividade, que
nenhum código do próprio projeto consegue avisar (R16).

**Decisão anterior (2026-10-27)**: e-mail pelo Resend, uma vez por problema e outra na
normalização, a partir da Clarification. Foi abandonada a pedido do mantenedor.

**Alternativas consideradas na revisão**:
- **Monitor externo, como o Healthchecks.io**: cada execução avisaria o monitor, e ele mandaria
  e-mail quando o aviso faltasse ou indicasse falha. Detectaria também a pausa do Supabase.
  Ficou como a melhor opção se a notificação voltar a ser necessária.
- **Webhook do Discord ou do Telegram**: mensagem no celular, mas a lógica de estado continuaria
  no projeto e a pausa não seria detectada.
- **Manter o Resend**: a pausa continuaria sem aviso, e a conta seria obrigatória.
- Antes, na clarify: a issue automática no GitHub (opção C) e o SMTP de um e-mail pessoal, que
  exigiria a senha de uma conta pessoal como segredo, foram rejeitados.

## R16. Planos gratuitos e riscos operacionais

| Serviço | Limite gratuito relevante | Uso estimado no MVP | Situação |
|---|---|---|---|
| Supabase: banco | 500 MB | Cerca de 403 postos, 4,2 mil coletas por ano e registros de execução: menos de 10 MB | OK |
| Supabase: tráfego de saída | 5 GB por mês | Cerca de 30 KB por consulta de área com gzip × poucas consultas por visita | OK até dezenas de milhares de visitas por mês. Monitorar. |
| Supabase: Edge Functions | 500 mil invocações por mês; 2 s de CPU por requisição | Cerca de 35 invocações por mês | OK |
| Vercel Hobby | Uso pessoal e não comercial; 100 GB de banda | Site gratuito e sem anúncios | OK |
| OpenFreeMap | Sem limite e sem garantia de disponibilidade | Tiles do mapa | OK, com plano B (R5) |

**Riscos e mitigações**:

1. **Pausa do Supabase por inatividade.** Projetos gratuitos são pausados depois de 1 semana sem
   atividade. As escritas diárias do `sync-precos` passam pela API e o site tem visitas, então a
   pausa não deve ocorrer, mas isso precisa ser confirmado. Como não há notificação ativa
   (R15), uma pausa só seria percebida visitando o site ou o painel. A mitigação está no
   quickstart: conferir no painel na primeira semana. Se for preciso, um ping externo gratuito
   ou um monitor como o Healthchecks.io resolve, com decisão registrada.
2. **O gov.br pode bloquear IPs de datacenter.** Criar o projeto Supabase na região
   **sa-east-1 (São Paulo)** reduz esse risco e a latência. Se mesmo assim houver bloqueio, entra
   o plano B do R6 (GitHub Actions).
3. **A ANP pode mudar o formato do arquivo ou da API.** A validação Zod falha, a execução é
   registrada como falha e o aviso público aparece (FR-027). Nada é gravado pela metade
   (FR-023).

## R17. Segurança das Edge Functions e do agendamento

**Decisão**: o deploy das Edge Functions é feito com `--no-verify-jwt`. Cada função exige o
cabeçalho `x-cron-secret`, comparado em tempo constante com o secret `CRON_SECRET`. O `pg_cron`
e o `pg_net` chamam as funções lendo a URL e o segredo do **Supabase Vault**, então nenhum
segredo aparece na migration.

**Justificativa**: projetos novos do Supabase usam chaves `sb_publishable_…`, que não são JWT. A
verificação de JWT bloquearia a chamada do cron (aprendizado registrado no plano anterior do
projeto, em 14/10). O segredo próprio basta, e só o banco o conhece (Princípio II).

**Agendamento** (fuso America/Sao_Paulo; o cron roda em UTC):

- `sync-precos`: todo dia às 09:00 de Brasília (12:00 UTC);
- `sync-postos`: toda segunda-feira às 06:00 de Brasília (09:00 UTC).

---

## Fontes consultadas

- API Revendedores da ANP:
  - [/v1/combustivel](https://revendedoresapi.anp.gov.br/v1/combustivel)
  - [Swagger](https://revendedoresapi.anp.gov.br/swagger/index.html)
- [ANP: Levantamento de Preços de Combustíveis, últimas semanas pesquisadas](https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas)
- [ANP: arquivo semanal de 18 a 24/10/2026](https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/arquivos-lpc/2026/revendas_lpc_2026_10_18-2026_10_24.xlsx)
- [ANP: Série histórica de preços de combustíveis (dados abertos)](https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/serie-historica-de-precos-de-combustiveis)
- [ANP: Metadados da série histórica](https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/shpc/metadados-serie-historica-precos-combustiveis-1.pdf)
- [ANP: Resolução nº 70/2014 (Padrão ANP4C)](https://www.normasbrasil.com.br/norma/resolucao-70-2014_280022.html)
- [ANP: Manual do app ODK](https://www.gov.br/anp/pt-br/assuntos/distribuicao-e-revenda/revendedor/arquivos/manual-app-odk.pdf) (não foi possível extrair o texto)
- Supabase:
  - [limites das Edge Functions](https://supabase.com/docs/guides/functions/limits)
  - [limites de CPU](https://supabase.com/docs/guides/troubleshooting/edge-function-cpu-limits)
  - [preços](https://supabase.com/pricing)
- OpenFreeMap:
  - [site](https://openfreemap.org)
  - [termos de uso](https://openfreemap.org/tos/)
- Outros provedores de tiles:
  - [MapTiler: preços](https://www.maptiler.com/cloud/pricing/)
  - [Stadia Maps: preços](https://stadiamaps.com/pricing/)
  - [Stadia Maps: FAQ](https://stadiamaps.com/faqs/)
- Documentação local do Next 16.4.3:
  - `01-app/02-guides/client-side-data-fetching/tanstack-query.md`
  - `01-app/02-guides/incremental-static-regeneration-cache-components.md`
  - `01-app/03-api-reference/04-functions/generate-static-params.md`
  - `01-app/03-api-reference/04-functions/generate-metadata.md`
