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
| `useListaPostos(postos, hoje)` | `postosVisiveis` e o "hoje" do servidor | `{ grupos: { titulo, itens: ItemListaVM[] }[], vazia: boolean, regua: ReguaVM \| null, sentido: 'asc'\|'desc', alternarSentido() }`, já com os grupos do FR-011. O sentido fica em estado local. Os `grupos` são só a página visível (D2): 20 postos por vez, na ordem dos grupos, e `mostrarMais: { texto, onMostrarMais } \| null` traz os próximos ("Mostrar mais 20 (faltam 123)"). A página volta ao começo quando a área ou o sentido mudam; o `titulo`, a `regua` e os `primeiros` da folha continuam olhando todos os postos da área. `regua` (`{ diferenca, percentual, menor, maior, pontos: { cnpj, posicao, maisBarato }[], descricao }`) usa só as coletas recentes, o mesmo critério do "mais barato", e é `null` com menos de 2 preços ou com todos iguais. |
| `useTema()` | Nada | `{ escuro: boolean, alternar() }`. A classe `dark` em `<html>` é aplicada antes da pintura pelo `<ScriptTema>` no `<head>`. A escolha fica no `localStorage` (`gasosinha-tema`), e sem escolha vale o tema do sistema. |
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
| `<ListaPostos vm>` | `titulo` ("8 postos nesta área"), grupos de `ItemListaVM` (`{ cnpj, nome, bandeira, semPreco, preco?, data?, idade?, antiga, fonte?, fonteCurta?, variacao: { valor, data, acessivel } \| null, direcaoVariacao, maisBarato, acimaDoMaisBarato: { curto: '+0,40', acessivel } \| null }`), `regua?: ReguaVM`, o controle segmentado de sentido ("Menor preço \| Maior preço"), `estado`, `onTentarDeNovo`, `onVerRegiaoInteira`, `mostrarMais?` e `substituirHistorico?` | É uma lista semântica. Cada item é um link para `/postos/[cnpj]` e mostra nome, bandeira, preço, data (com "coletado em" para leitores de tela), idade, a sigla da fonte ("ANP", com o nome completo para leitores de tela), o selo de variação compacto, numa linha só ("+0,10 (+1,5%) desde 13/10"; abaixo de 360 px, sem o "desde"; `aria-hidden`, com o texto completo e a data inteira em `sr-only`; D3) ou "sem coleta anterior", a pílula "Mais barato" e, nos outros itens recentes, quanto custam a mais que o mais barato ("+0,40 · ANP", com o texto completo para leitores de tela). A régua da área fica entre o título e o controle de sentido. Coleta antiga tem ícone de relógio e o texto "coleta antiga" (FR-029). Estados com o Gasosinha: vazio "Nenhum posto nesta área" com "Ver a região inteira"; carregando "Buscando os preços…" em `role="status"`; erro "Não foi possível carregar os postos." com o botão "Tentar de novo", mantendo os itens anteriores. Com `mostrarMais`, o botão fica abaixo da lista e, ao clicar, o foco vai para o primeiro posto novo (D2). |
| `<DetalhePosto>` | `{ vm: DetalheVM, parado: boolean, historico?: { visiveis, mostrarMais } }` | Mostra preço, data, fonte, idade em destaque, histórico e o Gasosinha, que apresenta a variação: o balão dele, com as cores e os ícones do selo, traz o `textoReacao` no lugar do selo de variação e do texto de "sem coleta anterior". Só renderiza o que recebe. O percentual em destaque (`variacaoPercentual`) é só visual (`aria-hidden`), porque o texto completo da variação está na fala do Gasosinha logo abaixo. O histórico mostra `grafico` (ou nada, com uma coleta só), `variacoesColetas` e a lista "Todas as coletas", paginada pelo `useHistoricoPaginado` do `PainelDetalhe` (D2): as 6 mais recentes e mais 10 a cada "Mostrar mais", com o foco na primeira nova. Todas continuam acessíveis (FR-014). |
| `<PainelDetalhe>` | `{ modo: 'modal' \| 'pagina', cnpj, hoje }` | É o único componente que chama os hooks do detalhe: `useDetalhePosto(cnpj, hoje)` e `usePrefereMenosMovimento()`, cujos resultados repassa ao `DetalhePosto` como `vm` e `parado`. `modo="modal"`: `Sheet` do shadcn; fechar ("Fechar" ou Esc) volta no histórico. No computador, o `Sheet` é um painel lateral **não modal** (`modal={false}`, sem sobreposição nem trava de rolagem): o mapa e a lista continuam usáveis, e clicar ou focar fora não fecha o detalhe (D1). O foco vai para o painel ao abrir e volta ao item de origem ao fechar. No celular, o `Sheet` continua modal, porque a folha cobre quase a tela toda. O painel marca o detalhe como aberto (`useMarcarDetalheAberto`); com ele aberto, o `TelaMapa` lê `useDetalheAberto()`, e os links de posto do mapa e da lista navegam com `replace`, para que "Fechar" volte ao mapa num passo só. `modo="pagina"`: `<section aria-labelledby>` na própria página, **sem portal** (o portal não renderiza no servidor, e o nome e o preço precisam estar no HTML), com o link "Voltar ao mapa" para `/`. |
| `<TelaMapa>` | `{ hoje, centroInicial?, painel? }` | Composição cliente do mapa, da lista, da busca e do botão de localização. O `painel`, quando é passado, substitui a lista (detalhe do posto em `/postos/[cnpj]`). |
| `<HistoricoPrecos itens>` | `{ data: 'dd/mm/aaaa', preco: 'R$ 6,49' }[]` | A lista completa (FR-014), abaixo do gráfico (R14, revisto). |
| `<GraficoHistorico grafico>` | `GraficoHistoricoVM`: `{ pontos: { x, y }[], rotulosY: { texto, y }[], referenciaY, inicio, fim, descricao }`, com as posições de 0 a 1 | SVG em degraus, grade fraca e linha tracejada na coleta anterior. Tem `role="img"` e `aria-label={descricao}`, que lista cada data e preço. |
| `<GradeVariacoes itens>` | `{ data: 'dd/mm', texto: '+0,10', direcao }[]` | Uma `<dl>` com a variação de cada coleta para a anterior. O sinal mostra a direção mesmo sem a cor (Princípio VII). |
| `<ReguaPrecos regua>` | `ReguaVM` | `role="img"` com `aria-label={descricao}`, lido como uma frase só. Mostra a diferença, o percentual, um ponto por posto (verde no mais barato) e o menor e o maior preço nas pontas. |
| `<Moeda texto>` | Texto já formatado (`'R$ 6,59'`) | Mostra o "R$" menor que o número. O texto lido continua `R$ 6,59`. |
| `<BotaoTema variante>` | `'redondo'` (celular, na folha) ou `'quadrado'` (desktop, sobre o mapa) | `<button>` com o nome "Mudar para o tema escuro" ou "Mudar para o tema claro". O estilo do mapa (OpenFreeMap `positron` ou `dark`) e as poses do Gasosinha (`*-dark.png`) seguem o tema. |
| `<Gasosinha reacao texto>` | `reacao: 'subiu'\|'caiu'\|'estavel'\|'neutro'`, `texto: string`, `parado: boolean` | A pose da reação, da arte do mascote (subiu → surpreso, caiu → feliz, estável → piscando, neutro → pensando), em PNG claro e `-dark`, que seguem o tema. Ela faz um pulinho em 4 degraus (`animate-pulinho`, `step-end`, 0,8 s). Com `parado`, mostra a mesma pose fixa. A imagem tem `alt=""`, e o `texto` fica visível e em `aria-live="polite"` (FR-019 e FR-020). |
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
| `formatarDataCurta(dataISO)` | `'2026-09-15'` → `15/09` |
| `formatarPercentualSemSinal(p)` | `6.5` → `6,5%` |
| `formatarDiferencaCurta(milesimos)` | `200` → `+0,20`; `-60` → `−0,06`; `0` → `0,00`; `15` → `+0,015` |
| `separarMoeda(texto)` | `'R$ 6,59'` → `{ simbolo: 'R$', valor: '6,59' }` |
