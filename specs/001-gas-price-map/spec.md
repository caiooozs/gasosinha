# Feature Specification: Gasosinha — Mapa de Preços da Gasolina por Posto

**Feature Branch**: `001-gas-price-map` (é o diretório da feature; nenhuma branch git foi criada)

**Created**: 2026-10-27

**Status**: Draft

**Input**: User description: "Gasosinha é um site público e gratuito com o mapa dos postos de
combustível de uma região." (a descrição completa, com contexto dos dados, histórias P1–P3, regras e
casos de borda, itens fora do escopo e critérios de sucesso, foi fornecida no comando
`/speckit-specify`)

## Clarifications

### Session 2026-10-27

- Q: Qual é a região coberta? → A: a Região Metropolitana do Recife (RMR), inteira.
- Q: Como a data da coleta aparece no marcador do mapa? → A: o marcador mostra o preço e a idade
  curta da coleta (ex.: "R$ 6,59 · há 7 d"). A data completa e a fonte ficam na lista e no
  detalhe. Isso levou à alteração MINOR do Princípio I da constituição (v1.1.0, de 02/11/2026),
  que aceita a idade no lugar da data em espaços compactos.
- Q: Quanto histórico existe no lançamento? → A: os últimos 12 meses de coletas.
- Q: Na lista ordenada por preço, como ficam os postos com coleta antiga (mais de 28 dias)? → A:
  as coletas recentes vêm primeiro, por preço; depois as antigas, por preço; e por último os
  "sem preço".
- Q: Em que condições se mede o critério de mapa utilizável em menos de 3 s no 4G? → A: em 4G
  típico simulado (cerca de 9 Mbps e 170 ms de latência), com processador 4× mais lento.
- Q: O detalhe de cada posto tem link próprio? → A: sim. Cada posto tem um endereço próprio, que
  abre direto no detalhe, pode ser compartilhado e é indexável por buscadores.
- Q: Como o mantenedor fica sabendo de falhas ou atrasos da atualização? → A: por e-mail, uma vez
  por problema, e outro e-mail quando a fonte voltar ao normal. **Revisto em 02/11/2026**: não há
  notificação ativa. O mantenedor acompanha as fontes pelo mesmo aviso público do site.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver os postos da região no mapa (Priority: P1)

O motorista abre o site e vê o mapa da Região Metropolitana do Recife com todos os postos
autorizados. Ele pode tocar em
"usar minha localização" para centralizar o mapa onde está, ou pode buscar uma cidade da região
pelo nome. Cada posto com preço mostra no marcador o valor da gasolina comum. Posto sem coleta
aparece com outra aparência e o rótulo "sem preço". Uma lista dos postos da área visível, ordenada
por preço, oferece as mesmas informações e serve de alternativa ao mapa.

**Why this priority**: é o núcleo do produto. Sem ver os postos e seus preços lado a lado, o
motorista não consegue decidir onde abastecer. Esta história sozinha já entrega valor, porque
permite achar o posto mais barato na área.

**Independent Test**: com os dados da região carregados, abrir o site, mover o mapa, buscar uma
cidade e usar a lista. Conferir que todos os postos autorizados da área aparecem, cada um com preço
e data da coleta ou com "sem preço". Não depende do detalhe do posto nem do mascote.

**Acceptance Scenarios**:

1. **Given** a pessoa abre o site pela primeira vez, **When** a página carrega, **Then** o mapa
   mostra a região padrão com os marcadores de todos os postos autorizados que estão na área
   visível.
2. **Given** o mapa está aberto, **When** a pessoa toca em "usar minha localização" e permite o
   acesso, **Then** o mapa é centralizado na posição dela, um ponto de "você está aqui" aparece e
   acompanha o movimento, e essa posição não sai do aparelho nem fica guardada.
3. **Given** a pessoa negou a localização ou o aparelho não consegue obtê-la, **When** ela usa o
   site, **Then** o mapa continua na região padrão e tudo funciona normalmente, com um aviso curto
   de que a localização não está disponível.
4. **Given** a pessoa digita o nome de uma cidade da região, com ou sem acento, **When** ela
   escolhe a cidade nos resultados, **Then** o mapa é centralizado nessa cidade.
5. **Given** um posto tem coleta de gasolina comum de R$ 6,59 em 20/10/2026 e hoje é 27/10/2026,
   **When** ele está na área visível, **Then** o marcador mostra "R$ 6,59 · há 7 d". O nome do
   marcador lido por leitores de tela inclui a data completa, 20/10/2026.
6. **Given** um posto autorizado nunca teve coleta, **When** ele está na área visível, **Then** o
   marcador tem aparência diferente dos marcadores com preço, a diferença não depende só de cor, e
   ele mostra o rótulo "sem preço".
7. **Given** a área visível tem postos com coleta recente, com coleta antiga e sem preço, **When**
   a pessoa abre a lista, **Then** ela vê os postos nesta ordem:
   - os de coleta recente, do mais barato para o mais caro;
   - os de coleta antiga, do mais barato para o mais caro;
   - os "sem preço".

   A pessoa pode inverter a ordem de preço dentro de cada grupo.
8. **Given** a pessoa move ou aproxima o mapa, **When** a área visível muda, **Then** a lista
   passa a mostrar apenas os postos da nova área.

---

### User Story 2 - Ver o histórico de preços do posto (Priority: P2)

Ao tocar num posto, no mapa ou na lista, a pessoa vê o detalhe dele:

- nome, bandeira e endereço;
- o preço mais recente, com a data da coleta, a idade da coleta e a fonte;
- os preços anteriores;
- quanto o preço subiu ou caiu, em R$ e em %, em relação à coleta anterior.

**Why this priority**: responde à segunda pergunta do motorista: o preço deste posto está subindo
ou caindo? Depende do P1 para chegar ao posto, mas também pode ser testada sozinha abrindo o
detalhe de um posto específico.

**Independent Test**: abrir o detalhe de postos com várias coletas, com uma só coleta e sem
nenhuma coleta, e conferir os dados, o histórico e a variação de cada caso.

**Acceptance Scenarios**:

1. **Given** um posto tem coletas de R$ 6,49 em 13/10/2026 e de R$ 6,59 em 20/10/2026, **When** a
   pessoa abre o detalhe, **Then** ela vê:
   - nome, bandeira e endereço;
   - "R$ 6,59", coletado em 20/10/2026, com a fonte;
   - a coleta de 13/10/2026 (R$ 6,49) entre os preços anteriores;
   - a variação "+R$ 0,10 (+1,5%) desde 13/10/2026".
2. **Given** um posto teve coletas de R$ 6,59 e depois de R$ 6,39, **When** a pessoa abre o
   detalhe, **Then** a variação mostrada é "−R$ 0,20 (−3,0%)" com a data da coleta anterior.
3. **Given** um posto tem uma única coleta, **When** a pessoa abre o detalhe, **Then** ela vê o
   preço e a data, e a mensagem de que ainda não há coleta anterior para comparar. Nenhuma
   variação aparece, nem mesmo zero.
4. **Given** um posto nunca teve coleta, **When** a pessoa abre o detalhe, **Then** ela vê nome,
   bandeira e endereço com "sem preço", sem valor, sem histórico e sem variação.
5. **Given** a coleta mais recente de um posto é de 22/09/2026 e hoje é 27/10/2026, **When** a
   pessoa abre o detalhe, **Then** o valor continua visível e a idade "coletado há 5 semanas"
   aparece em destaque.
6. **Given** a pessoa navega pela lista só com o teclado, **When** ela aciona um posto, **Then** o
   detalhe abre com o foco nele. Ao fechar o detalhe, o foco volta ao item da lista.
7. **Given** a pessoa recebeu o link de um posto, **When** ela o abre, **Then** o site mostra
   direto o detalhe desse posto, com o mapa centralizado nele.

---

### User Story 3 - Gasosinha reage à variação (Priority: P3)

No detalhe do posto, o Gasosinha, um mascote em pixel art, mostra uma reação que depende da
variação em relação à coleta anterior, acompanhada de um texto curto:

- uma reação quando o preço subiu;
- outra quando caiu;
- outra quando ficou estável;
- uma reação neutra quando não há coleta anterior.

**Why this priority**: dá identidade ao site e torna a variação compreensível num relance. Depende
do P2, porque usa a mesma variação, e não muda os dados mostrados.

**Independent Test**: abrir o detalhe de postos com preço que subiu, que caiu, que ficou igual e
sem coleta anterior. Conferir a reação e o texto de cada um, com e sem a preferência por menos
movimento ativada.

**Acceptance Scenarios**:

1. **Given** o preço subiu de R$ 6,49 para R$ 6,59, **When** o detalhe abre, **Then** o Gasosinha
   mostra a reação "subiu" e o texto "Subiu R$ 0,10 (+1,5%) desde 13/10/2026".
2. **Given** o preço caiu de R$ 6,59 para R$ 6,39, **When** o detalhe abre, **Then** o Gasosinha
   mostra a reação "caiu" e um texto com a queda em R$, em % e a data da coleta anterior.
3. **Given** o preço é igual ao da coleta anterior, **When** o detalhe abre, **Then** o Gasosinha
   mostra a reação "estável" e um texto dizendo que o preço é o mesmo da coleta anterior, com a
   data dela.
4. **Given** o posto tem uma única coleta ou nenhuma, **When** o detalhe abre, **Then** o
   Gasosinha mostra a reação neutra com um texto que explica a ausência de comparação.
5. **Given** a pessoa ativou no sistema a preferência por menos movimento, **When** o detalhe
   abre, **Then** o Gasosinha aparece parado, na pose da reação correspondente, e o texto continua
   o mesmo.
6. **Given** a pessoa usa leitor de tela, **When** o detalhe abre, **Then** ela recebe o texto da
   reação. A informação nunca depende só da imagem ou da animação.

---

### Edge Cases

- **Posto sem nenhuma coleta**: aparece como "sem preço" no mapa, na lista e no detalhe. Fica no
  fim da lista ordenada por preço, e o Gasosinha mostra a reação neutra.
- **Coleta antiga**: o valor continua visível. A idade da coleta fica em destaque, por exemplo
  "coletado há 5 semanas". Na lista, o posto vem depois de todos os postos com coleta recente,
  mesmo que o preço dele seja menor.
- **Coleta anterior muito distante**: a variação é calculada mesmo assim, sempre exibida com a data
  da coleta anterior, para a pessoa saber o período comparado.
- **Posto fechado ou sem autorização**: sai do mapa e da lista, mas o histórico de preços dele é
  mantido. Se o posto voltar a ser autorizado, reaparece com o histórico.
- **Preço com CNPJ desconhecido**: um preço cujo CNPJ não corresponde a nenhum posto autorizado
  não é exibido e nunca é atribuído a outro posto. Ele fica guardado e é contabilizado.
- **Posto sem localização válida no cadastro**: não é posicionado por palpite. Fica fora do mapa e
  é contabilizado.
- **Coletas conflitantes**: se a fonte trouxer duas coletas do mesmo posto na mesma data com
  valores diferentes, nenhuma delas é gravada, e o caso é contabilizado como registro inválido.
- **Fonte fora do ar ou atrasada**: o site continua com os últimos dados válidos e mostra um aviso
  com a data da última atualização bem-sucedida.
- **Atualização repetida ou interrompida**: rodar a atualização duas vezes não duplica nem altera
  registros. Uma atualização interrompida é concluída na próxima execução, também sem duplicar.
- **Pessoa fora da região coberta**: se ela usa a localização, o mapa fica na região padrão e
  mostra um aviso de que ela está fora da área coberta.
- **Busca sem resultado**: uma cidade que não existe ou está fora da região mostra uma mensagem e
  o mapa não se move.
- **Área sem postos**: a lista mostra um estado vazio ("Nenhum posto nesta área").
- **Falha ao carregar**: se os postos ou o detalhe não carregarem, o site mostra uma mensagem com
  a opção "tentar de novo", e os dados que já estavam na tela continuam visíveis. Se o mapa base
  não carregar, o site avisa e a lista continua utilizável.
- **Muitos postos na área**: com o zoom afastado, os postos próximos são agrupados com a quantidade
  indicada. Ao aproximar, os marcadores individuais aparecem.
- **Bandeira**: posto sem bandeira no cadastro mostra "bandeira não informada". Posto "bandeira
  branca" mostra exatamente isso.
- **Link de posto que perdeu a autorização**: o detalhe abre com o histórico e um aviso de que o
  posto não consta mais como autorizado. O posto continua fora do mapa e da lista.
- **Link de posto inexistente**: o site mostra "posto não encontrado" e um caminho de volta para
  o mapa.
- **Fechar o detalhe aberto por link**: quem abriu o detalhe direto pelo link e o fecha vai para
  o mapa do site, nunca para fora dele.
- **Menos movimento**: com essa preferência ativada, nenhuma animação do Gasosinha é executada.

## Requirements *(mandatory)*

### Functional Requirements

**Mapa e lista (P1)**

- **FR-001**: O sistema DEVE exibir num mapa todos os postos de combustível autorizados da
  Região Metropolitana do Recife (RMR), desde que tenham localização válida no cadastro oficial.
  A RMR é formada pelos 15 municípios listados em Assumptions.
- **FR-002**: Ao abrir o site, o mapa DEVE mostrar a região padrão (a RMR inteira) enquanto a
  pessoa não pedir a localização nem buscar uma cidade.
- **FR-003**: A pessoa DEVE poder pedir, por uma ação explícita, que o mapa seja centralizado na
  posição dela. O site NÃO DEVE pedir a localização automaticamente ao abrir.
- **FR-004**: A posição da pessoa DEVE ser usada apenas para centralizar o mapa e para mostrar
  nele um ponto de "você está aqui", que acompanha o movimento enquanto o site está visível e para
  quando ele sai da tela (constituição v1.2.0, Princípio III). Com o acompanhamento ligado, o mapa
  segue a pessoa até ela arrastá-lo. Ela NÃO DEVE sair do aparelho, ser guardada (inclusive no
  endereço da página) nem ser registrada; fica só na memória da página. O que o site pede ao
  servidor DEVE depender apenas da área que o mapa mostra.
- **FR-005**: Se a localização for negada, estiver indisponível ou cair fora da região coberta, o
  mapa DEVE permanecer na região padrão. O site DEVE continuar utilizável e mostrar um aviso
  curto.
- **FR-006**: A pessoa DEVE poder buscar pelo nome um dos municípios da RMR, sem diferenciar
  maiúsculas nem acentos, e centralizar o mapa nele. Uma busca sem resultado, ou por cidade fora
  da RMR, DEVE mostrar uma mensagem.
- **FR-007**: O marcador de um posto com preço DEVE mostrar o valor da gasolina comum em R$ e a
  idade curta da coleta (ex.: "R$ 6,59 · há 7 d", "R$ 6,49 · há 5 sem"). O nome do marcador lido
  por leitores de tela DEVE incluir a data completa da coleta (dd/mm/aaaa).
- **FR-008**: O marcador de um posto sem coleta DEVE ter aparência distinta, que não dependa só de
  cor, e o rótulo "sem preço".
- **FR-009**: Quando houver tantos postos que os marcadores se sobreponham, o mapa DEVE agrupá-los
  e mostrar a quantidade de cada grupo. Ao aproximar o mapa, os marcadores individuais DEVEM
  aparecer.
- **FR-010**: O site DEVE oferecer uma lista dos postos da área visível do mapa, atualizada quando
  o mapa se move. Cada item com preço DEVE mostrar:
  - nome e bandeira;
  - preço, data e idade da coleta, com o destaque do FR-029 quando a coleta for antiga;
  - a fonte;
  - a variação em relação à coleta anterior, como no FR-015, ou a indicação de que não há coleta
    anterior.

  Posto sem coleta mostra nome, bandeira e "sem preço".
- **FR-011**: A lista DEVE ser ordenada em três grupos fixos, nesta ordem:
  - postos com coleta recente (até 28 dias);
  - postos com coleta antiga (mais de 28 dias);
  - postos "sem preço".

  Dentro dos dois primeiros grupos, a ordem inicial DEVE ser do menor para o maior preço. A
  pessoa DEVE poder inverter essa ordem, mas a ordem dos grupos não muda.
- **FR-012**: A lista DEVE ser uma alternativa completa ao mapa. Todo posto do mapa DEVE estar na
  lista, e o detalhe de cada posto DEVE poder ser aberto a partir dela, inclusive só com o teclado.

**Detalhe do posto (P2)**

- **FR-013**: O site DEVE abrir o detalhe de um posto quando a pessoa o seleciona, por toque,
  clique ou teclado, no mapa ou na lista. O detalhe DEVE mostrar:
  - nome, bandeira e endereço;
  - o preço mais recente da gasolina comum;
  - a data da coleta no formato dd/mm/aaaa;
  - a idade da coleta;
  - a fonte.

  Cada posto DEVE ter um endereço próprio que abre direto no detalhe, pode ser compartilhado e é
  indexável por buscadores. Esse endereço identifica apenas o posto e NÃO DEVE conter dados da
  posição da pessoa.
- **FR-014**: O detalhe DEVE listar as coletas anteriores do posto, da mais recente para a mais
  antiga, cada uma com data e valor.
- **FR-015**: O detalhe DEVE mostrar a variação entre a coleta mais recente e a imediatamente
  anterior, junto com a data da coleta anterior:
  - em R$, com sinal;
  - em %, com sinal e uma casa decimal.
- **FR-016**: Quando não houver coleta anterior, o detalhe NÃO DEVE mostrar variação, nem mesmo
  zero, e DEVE informar que ainda não há coleta anterior para comparar. Quando não houver nenhuma
  coleta, o detalhe DEVE mostrar "sem preço", sem histórico e sem variação.
- **FR-017**: No lançamento, o histórico de cada posto DEVE incluir as coletas dos 12 meses
  anteriores, quando existirem na fonte. Depois do lançamento, o histórico DEVE continuar
  crescendo a cada nova edição da pesquisa, e nenhuma coleta DEVE ser apagada.

**Gasosinha (P3)**

- **FR-018**: O detalhe DEVE mostrar o Gasosinha, em pixel art, com uma de quatro reações,
  definida pela comparação entre a coleta mais recente e a anterior:
  - **subiu**: o preço mais recente é maior;
  - **caiu**: o preço mais recente é menor;
  - **estável**: o preço é igual;
  - **neutra**: não há coleta anterior ou não há preço.
- **FR-019**: Cada reação DEVE vir com um texto curto da variação, por exemplo "Subiu R$ 0,10
  (+1,5%) desde 13/10/2026". O texto DEVE estar disponível para leitores de tela, e a informação
  NÃO DEVE depender só da imagem ou da animação.
- **FR-020**: Quando a pessoa preferir menos movimento, o Gasosinha DEVE aparecer parado, na pose
  da reação correspondente, com o mesmo texto.

**Dados e atualização**

- **FR-021**: O sistema DEVE atualizar sozinho, sem ação manual, os dados do cadastro de postos e
  os da pesquisa de preços.
- **FR-022**: Rodar a atualização mais de uma vez sobre os mesmos dados NÃO DEVE criar registros
  duplicados nem alterar registros existentes. Uma atualização interrompida DEVE poder ser
  concluída na execução seguinte sem duplicar dados.
- **FR-023**: Todo dado recebido das fontes DEVE ser validado antes de ser gravado. Registros
  inválidos, incluindo coletas conflitantes do mesmo posto na mesma data, DEVEM ser descartados e
  contabilizados. Eles NÃO DEVEM ser gravados pela metade nem corrigidos por palpite.
- **FR-024**: Cada preço DEVE ser ligado ao seu posto pelo CNPJ. Um preço cujo CNPJ não
  corresponda a um posto autorizado NÃO DEVE ser exibido nem atribuído a outro posto. Ele DEVE
  ficar guardado e ser contabilizado.
- **FR-025**: O sistema NÃO DEVE estimar, interpolar, arredondar para outro valor ou copiar preços
  entre postos, nem preencher a falta de preço com médias.
- **FR-026**: Um posto que fechou ou perdeu a autorização DEVE sair do mapa e da lista, e o
  histórico de preços dele NÃO DEVE ser apagado.
- **FR-027**: Se a última tentativa de atualizar uma fonte falhar, se a pesquisa de preços ficar
  mais de 14 dias sem nova edição incorporada, ou se o cadastro ficar mais de 8 dias sem
  atualização bem-sucedida, o sistema DEVE:
  - continuar mostrando os últimos dados válidos;
  - exibir um aviso visível com a data da última atualização bem-sucedida;
  - remover o aviso depois da próxima atualização bem-sucedida.

  Não há notificação ativa ao mantenedor. Ele acompanha a situação das fontes por esse mesmo
  aviso.

**Apresentação e acesso**

- **FR-028**: Toda a interface DEVE estar em português do Brasil, com:
  - valores em R$ com vírgula decimal, nas casas decimais em que vieram da fonte;
  - datas no formato dd/mm/aaaa, no horário de Brasília.
- **FR-029**: A idade da coleta DEVE aparecer no marcador, na lista e no detalhe. Quando a coleta
  tiver mais de 28 dias, a idade DEVE ganhar destaque visual, que não dependa só de cor, sem
  esconder o valor.
- **FR-030**: A fonte dos preços DEVE ser identificada na lista e no detalhe, e DEVE haver uma
  atribuição permanente das fontes na tela do mapa.
- **FR-031**: Todas as funções DEVEM funcionar em telas de celular a partir de 360 px de largura e
  no computador. Elas DEVEM ser operáveis só com o teclado, com foco visível, e atender ao
  contraste WCAG AA.
- **FR-032**: O site DEVE ser público e gratuito, sem cadastro nem login.

### Key Entities *(include if feature involves data)*

- **Posto**: estabelecimento autorizado a vender combustível.
  - **Atributos**: CNPJ (identificador), nome, bandeira, endereço, município, localização,
    situação da autorização (autorizado ou não) e data da última alteração cadastral, que só
    muda quando algum dado do posto muda.
  - **Relações**: um posto tem zero ou mais coletas de preço.
- **Coleta de preço**: um preço observado pela pesquisa oficial.
  - **Atributos**: CNPJ do posto, produto (gasolina comum), valor em R$, data da coleta, fonte e
    edição da pesquisa de origem.
  - **Regra**: há no máximo uma coleta por posto, produto e data.
- **Cidade**: município da região coberta, com nome e localização, usado na busca.
- **Região coberta**: limites da área atendida pelo site e enquadramento padrão do mapa.
- **Atualização de fonte**: registro de cada execução por fonte.
  - **Atributos**: data e hora, resultado, edição incorporada, quantidade de registros gravados,
    rejeitados e sem posto correspondente.
  - **Uso**: dela vem a data da última atualização bem-sucedida, mostrada no aviso.
- **Variação** (derivada, não armazenada): diferença em R$ e em % entre a coleta mais recente e a
  anterior do mesmo posto. Define a reação do Gasosinha.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos postos autorizados dos 15 municípios da RMR com localização válida no
  cadastro oficial aparecem no mapa. Os postos sem localização válida são contabilizados, e
  nenhum some sem registro.
- **SC-002**: 100% dos preços no mapa mostram a idade da coleta, com a data completa no nome lido
  por leitores de tela. 100% dos preços na lista e no detalhe mostram a data completa da coleta
  (dd/mm/aaaa) e a fonte.
- **SC-003**: O mapa fica utilizável em menos de 3 s após a abertura do site, sem nada guardado
  de visitas anteriores, nestas condições:
  - rede 4G típica simulada, com cerca de 9 Mbps de download e 170 ms de latência;
  - processador 4× mais lento, para simular um celular intermediário.

  Utilizável quer dizer que os postos da área visível estão desenhados e o mapa responde a
  arrastar e a aproximar.
- **SC-004**: Em teste com pessoas, pelo menos 9 de cada 10 acham o posto com o menor preço
  recente (coleta de até 28 dias) perto delas em menos de 15 s, contados a partir da abertura do
  site.
- **SC-005**: Uma nova edição da pesquisa de preços aparece no site em até 48 h após ser publicada
  pela fonte, sem nenhuma ação manual.
- **SC-006**: Rodar a atualização duas vezes seguidas sobre a mesma publicação resulta em 0
  registros novos e 0 registros alterados na segunda execução.
- **SC-007**: 100% dos preços exibidos correspondem a uma coleta da fonte para aquele CNPJ e
  aquela data. Nenhum preço é estimado, arredondado para outro valor ou copiado de outro posto.
- **SC-008**: Quando uma fonte falha, o site continua mostrando os últimos dados válidos e o aviso
  em 100% das visitas, até a próxima atualização bem-sucedida.
- **SC-009**: As tarefas das histórias P1 a P3 podem ser concluídas só com o teclado e com leitor
  de tela, e 100% dos textos atendem ao contraste WCAG AA.

## Assumptions

- **Região coberta**: a Região Metropolitana do Recife, composta por 15 municípios: Abreu e Lima,
  Araçoiaba, Cabo de Santo Agostinho, Camaragibe, Goiana, Igarassu, Ilha de Itamaracá, Ipojuca,
  Itapissuma, Jaboatão dos Guararapes, Moreno, Olinda, Paulista, Recife e São Lourenço da Mata. O
  plano deve confirmar essa composição com a lei estadual vigente.
- **Histórico inicial**: no lançamento, são importados os 12 meses de coletas anteriores. Se a
  fonte publicar o histórico num formato diferente da edição semanal, o plano trata isso como uma
  importação à parte.
- **Fontes**: as fontes são o cadastro oficial de postos revendedores autorizados e o
  Levantamento de Preços de Combustíveis, a pesquisa semanal por amostragem. Presume-se que ambas
  sejam da ANP e públicas. Isso deve ser confirmado no plano.
- **Localização no cadastro**: presume-se, como descrito, que o cadastro oficial traga a
  localização de cada posto. Se ele trouxer só o endereço, o plano precisa resolver como obter as
  coordenadas sem custo. Se a solução usar um serviço cobrado, a decisão precisa ser explícita
  (Princípio VI da constituição).
- **Cobertura da pesquisa**: a pesquisa não cobre todos os municípios nem todos os postos. Pode
  haver municípios da RMR inteiramente "sem preço". Isso é esperado e não é erro.
- **Produto**: "gasolina comum" é o produto com esse nome na pesquisa. Gasolina aditivada fica de
  fora, assim como os demais combustíveis.
- **Estável**: o preço é estável quando é exatamente igual ao da coleta anterior. Qualquer
  diferença conta como subiu ou caiu.
- **Formato da idade**: dias até 13 dias ("há 3 dias"), semanas até 12 semanas ("há 5 semanas") e
  meses a partir daí ("há 4 meses"). No marcador, usa-se a forma curta ("há 3 d", "há 5 sem",
  "há 4 meses"). A coleta é considerada antiga a partir de 29 dias.
- **Atrasos**: a pesquisa é semanal, então ela é tratada como atrasada depois de 14 dias sem nova
  edição. O cadastro, atualizado toda semana, é tratado como com problema quando a última
  tentativa de atualizá-lo falha ou quando passa mais de 8 dias sem uma atualização
  bem-sucedida, o que também revela um agendamento parado.
- **Frequência**: as fontes são consultadas pelo menos uma vez por dia, o que permite cumprir o
  SC-005.
- **Acompanhamento das fontes**: não há notificação ativa ao mantenedor (decisão de 02/11/2026).
  Ele acompanha a situação pelo aviso público do site (FR-027) e pelo registro das execuções.
  Isso aceita o risco de demorar a perceber uma falha, inclusive uma pausa do projeto por
  inatividade, em troca de não depender de mais um serviço nem de mais um segredo.
- **"Perto da pessoa"**: significa a área visível do mapa depois de centralizado. A lista não
  ordena por distância, porque a posição só pode ser usada para centralizar o mapa e mostrar o
  ponto de "você está aqui" (Princípio III da constituição).
- **Público**: qualquer pessoa, pelo navegador do celular ou do computador. Não há conta, perfil
  nem dado pessoal guardado.
- **Fora do escopo desta feature**:
  - etanol, diesel, GNV, gasolina aditivada e outros combustíveis;
  - preço informado por usuários;
  - rota até o posto;
  - login, favoritos e alertas;
  - app mobile nativo.
- **Dependências**:
  - disponibilidade pública das duas fontes oficiais;
  - um mapa base de provedor com plano gratuito suficiente para o tráfego esperado (Princípio VI).
