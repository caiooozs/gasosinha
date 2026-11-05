# Contrato: rotas, viewmodels e componentes do front

## Rotas públicas

| Rota | Conteúdo | Renderização |
|---|---|---|
| `/` | Mapa da RMR, lista da área visível, busca de cidade, botão "usar minha localização" e aviso de fonte | A estrutura estática é pré-renderizada. A composição cliente (`TelaMapa`) fica atrás de `<Suspense>`, e o mapa é carregado sob demanda. Os dados chegam via `usePostosNaArea`. |
| `/postos/[cnpj]` | Detalhe do posto, com histórico e Gasosinha, ao lado do mapa centralizado no posto | Página indexável (R11): `generateStaticParams` com os postos ativos, `'use cache'` e `cacheLife('hours')`, hidratação pré-renderizável e `generateMetadata` com preço e data. O detalhe é renderizado na própria página, sem portal, para que o nome e o preço estejam no HTML. |
| `/postos/[cnpj]` inexistente | "Posto não encontrado" e link para o mapa | `notFound()` |

**Regras de URL (FR-004 e FR-013)**:
- Nenhuma rota guarda a posição da pessoa nem o centro do mapa na URL.
- O link de um posto contém **apenas** o CNPJ.
- Abrir o detalhe a partir do mapa ou da lista navega para `/postos/[cnpj]`, que abre como modal
  sobre o mapa (rota interceptada). Fechar volta para `/` e devolve o foco ao item de origem.
- Quem abre `/postos/[cnpj]` direto pelo link recebe a página completa: o detalhe aparece na
  própria página, ao lado do mapa centralizado no posto, e o link "Voltar ao mapa" leva para
  `/`, nunca para fora do site.

## Viewmodels (hooks; `features/*/viewmodels`)

| Hook | Entrada | Saída para a view |
|---|---|---|
| `useHoje(hojeServidor)` | O "hoje" calculado no servidor por `hojeParaRender()` (`'use cache'`, `cacheLife('hours')`) | `DataISO`. Usa `useSyncExternalStore`: no pré-render e na hidratação vale o valor do servidor, e depois vale `hojeEmSaoPaulo(new Date())` do navegador. Nenhum outro código cliente lê a hora no render. |
| `usePostosNaArea({ bboxVisivel, zoom, hoje })` | Área visível bruta do mapa, zoom e o "hoje" do servidor | `{ estado: 'carregando'\|'erro'\|'pronto', postos, postosVisiveis, marcadores: MarcadorVM[], grupos: GrupoVM[], tentarDeNovo() }`. A query só roda depois que existe a área visível. Quantiza a área (R13), chama o RPC, agrupa com `supercluster` e calcula idade e rótulos com `useHoje`. `postosVisiveis` são só os postos dentro da área visível de fato, sem a margem da quantização, e alimentam a lista. Com erro, os dados anteriores continuam em `postos`. |
| `useListaPostos(postos, hoje)` | `postosVisiveis` e o "hoje" do servidor | `{ grupos: { titulo, itens: ItemListaVM[] }[], vazia: boolean, sentido: 'asc'\|'desc', alternarSentido() }`, já com os grupos do FR-011. O sentido fica em estado local. |
| `useDetalhePosto(cnpj, hoje)` | CNPJ e o "hoje" do servidor | `DetalheVM` com o histórico formatado, a variação, a idade, `reacao` e `textoReacao`. Usa `useSuspenseQuery`, com a mesma chave da hidratação no servidor. |
| `useBuscaCidade()` | Texto digitado | `{ resultados: MunicipioRMR[], selecionar(m) }`. Busca local, sem rede. |
| `useLocalizacao()` | Nada (age só com a ação "usar minha localização") | `{ pedir(): Promise<'centralizado'\|'negado'\|'indisponivel'\|'fora_da_regiao'> }`. A posição é passada só ao `flyTo` do mapa e nunca é guardada (Princípio III). |
| `useStatusFontes()` | Nada | `{ aviso: null \| { texto: string } }` (FR-027). Se a leitura falhar, devolve `aviso: null`, sem travar o site. |
| `usePrefereMenosMovimento()` | Nada | `boolean`, lido de `matchMedia('(prefers-reduced-motion: reduce)')`. |

Os VMs entregam **textos prontos**: preço formatado, data dd/mm/aaaa, idade e nome acessível. As
views não formatam nada (Princípios IV e VIII).

## Componentes de view (`components/`)

| Componente | Props | Regras de acessibilidade e exibição |
|---|---|---|
| `<MarcadorPosto vm>` | `{ preco: 'R$ 6,59' \| null, idade: 'há 7 d' \| null, nomeAcessivel, antigo: boolean, semPreco: boolean, maisBarato: boolean, onSelecionar }` | É um `<button>`. O `aria-label` é o `nomeAcessivel` (ex.: "Posto Iguep, Vibra, gasolina comum R$ 6,59, coletado em 20/10/2026"). Pílula com ponta, preço e idade em pesos diferentes (identidade visual no Paper). "Sem preço" tem **forma** diferente, além da cor (FR-008). "Antigo" tem ícone e texto, além da cor (FR-029). "Mais barato" (menor preço entre as coletas recentes da área visível) é verde, com seta, e o nome acessível termina com "mais barato da área". |
| `<MarcadorGrupo vm>` | `{ quantidade, onAproximar }` | É um `<button>` com o nome "12 postos, aproximar". |
| `<ListaPostos vm>` | `titulo` ("8 postos nesta área"), grupos de `ItemListaVM` (`{ cnpj, nome, bandeira, semPreco, preco?, data?, idade?, antiga, fonte?, fonteCurta?, variacao: string \| null, direcaoVariacao, maisBarato }`), o controle segmentado de sentido ("Menor preço \| Maior preço"), `estado`, `onTentarDeNovo` e `onVerRegiaoInteira` | É uma lista semântica. Cada item é um link para `/postos/[cnpj]` e mostra nome, bandeira, preço, data (com "coletado em" para leitores de tela), idade, a sigla da fonte ("ANP", com o nome completo para leitores de tela), o selo de variação (ou "sem coleta anterior") e o selo "mais barato". Coleta antiga tem ícone de relógio e o texto "coleta antiga" (FR-029). Estados com o Gasosinha: vazio "Nenhum posto nesta área" com "Ver a região inteira"; carregando "Buscando os preços…" em `role="status"`; erro "Não foi possível carregar os postos." com o botão "Tentar de novo", mantendo os itens anteriores. |
| `<DetalhePosto>` | `{ vm: DetalheVM, parado: boolean }` | Mostra preço, data, fonte, idade em destaque, histórico, variação e o Gasosinha. Só renderiza o que recebe. |
| `<PainelDetalhe>` | `{ modo: 'modal' \| 'pagina', cnpj, hoje }` | É o único componente que chama os hooks do detalhe: `useDetalhePosto(cnpj, hoje)` e `usePrefereMenosMovimento()`, cujos resultados repassa ao `DetalhePosto` como `vm` e `parado`. `modo="modal"`: `Sheet` do shadcn, com foco gerenciado; fechar volta no histórico. `modo="pagina"`: `<section aria-labelledby>` na própria página, **sem portal** (o portal não renderiza no servidor, e o nome e o preço precisam estar no HTML), com o link "Voltar ao mapa" para `/`. |
| `<TelaMapa>` | `{ hoje, centroInicial?, painel? }` | Composição cliente do mapa, da lista, da busca e do botão de localização. O `painel`, quando é passado, substitui a lista (detalhe do posto em `/postos/[cnpj]`). |
| `<HistoricoPrecos itens>` | `{ data: 'dd/mm/aaaa', preco: 'R$ 6,49' }[]` | Lista, sem gráfico (R14). |
| `<Gasosinha reacao texto>` | `reacao: 'subiu'\|'caiu'\|'estavel'\|'neutro'`, `texto: string`, `parado: boolean` | Sprite PNG com `image-rendering: pixelated` e animação CSS `steps()`. Com `parado`, mostra um quadro fixo da mesma reação. A imagem tem `alt=""`, e o `texto` fica visível e em `aria-live="polite"` (FR-019 e FR-020). |
| `<AvisoFonte vm>` | `{ texto }` | Usa `role="status"` e fica visível no topo, sem cobrir o mapa. É renderizado no `app/layout.tsx`, em todas as rotas, inclusive `/postos/[cnpj]` (SC-008). |
| `<MapaPostos>` | Saída de `usePostosNaArea`, os comandos de centralizar e `centroInicial?: { lng, lat }` (sem ela, abre na região padrão) | Mostra "Carregando postos…" ou o erro com "Tentar de novo" sobre o mapa, sem bloqueá-lo. Se o estilo do mapa falhar, mostra "Não foi possível carregar o mapa. Use a lista." |
| `<AtribuicaoFontes>` | `{ atualizadoEm: 'dd/mm/aaaa' \| null, variante }` | Texto com a ANP, a data da última atualização dos preços e o mapa base (OpenFreeMap © OpenMapTiles © OpenStreetMap), sempre visível (FR-030). Substitui o controle de atribuição do MapLibre. |

## Formatação (Princípio VIII)

O módulo único é `lib/formato`. Só o front formata valores para exibição.

| Função | Exemplo |
|---|---|
| `formatarPreco(milesimos)` | `6590` → `R$ 6,59`; `6599` → `R$ 6,599` |
| `formatarData(dataISO)` | `'2026-10-20'` → `20/10/2026`, sem `new Date()` |
| `formatarIdade(idade, curta)` | `{dias: 7}` → `há 7 dias` / `há 7 d`; `{dias: 35}` → `há 5 semanas` / `há 5 sem` |
| `formatarPercentual(p)` | `1.5` → `+1,5%`; `-3` → `−3,0%`; `0` → `0,0%` |
| `formatarVariacao(v)` | `+R$ 0,10 (+1,5%) desde 13/10/2026`; `−R$ 0,20 (−3,0%) desde …` |
