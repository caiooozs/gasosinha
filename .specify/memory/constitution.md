# Constituição do Gasosinha

O Gasosinha é um site público que mostra num mapa os postos de combustível de uma região, com o
preço da gasolina de cada posto e como esse preço variou ao longo do tempo.

## Princípios Fundamentais

### I. Dado com Origem e Data

- Todo preço exibido DEVE vir acompanhado da data da coleta e da fonte do dado.
- Em espaços compactos, como o marcador do mapa, a data PODE ser trocada pela idade da coleta
  calculada a partir dela (ex.: "há 7 d"), desde que:
  - a data completa esteja no nome acessível do elemento;
  - a data completa e a fonte estejam na lista e no detalhe;
  - a fonte apareça numa atribuição permanente e visível na mesma tela.
- O sistema NÃO DEVE inventar, estimar, interpolar ou arredondar preços para outro valor. Também
  NÃO DEVE copiar o preço de um posto para outro nem preencher a lacuna com média da região, do
  município ou da bandeira.
- Posto sem coleta DEVE aparecer como "sem preço". O valor zero NÃO DEVE ser usado para
  representar ausência de preço.
- A variação de preço DEVE ser calculada apenas entre coletas reais do mesmo posto.
- Todo dado externo (arquivos, respostas de API, planilhas) DEVE passar por validação de schema
  antes de ser gravado. Registro inválido DEVE ser rejeitado e contabilizado. Ele NÃO DEVE ser
  gravado pela metade nem "corrigido" por palpite.

**Justificativa**: o valor do Gasosinha está na confiança no preço mostrado. Um preço sem data ou
sem fonte, ou um preço estimado, engana quem decide onde abastecer.

### II. Segredo Fica no Servidor

- A service role do Supabase e os tokens de serviços externos DEVEM existir apenas nos secrets das
  Edge Functions e nas variáveis de ambiente do servidor.
- Segredos NÃO DEVEM aparecer em código que roda no navegador, em variáveis `NEXT_PUBLIC_*`, no
  repositório ou em logs. Arquivos `.env` com valores reais NÃO DEVEM ser versionados.
- O navegador DEVE usar apenas a chave pública (anon/publishable) do Supabase e ler apenas dados
  públicos.
- Toda tabela e view exposta pela API DEVE ter RLS habilitada. Para os papéis `anon` e
  `authenticated`, a única política permitida é a de leitura (`SELECT`). A escrita acontece
  somente pela service role, dentro das Edge Functions e dos importadores.

**Justificativa**: o site é público e o código do cliente fica visível para qualquer pessoa. A
única barreira real contra escrita indevida é o segredo guardado no servidor somado à RLS de só
leitura.

### III. Localização É da Pessoa

- A posição do usuário DEVE ser usada apenas para centralizar o mapa.
- A posição NÃO DEVE ser enviada ao backend nem armazenada em banco de dados, `localStorage`,
  `sessionStorage`, cookies ou URL. Ela também NÃO DEVE ser registrada em logs ou ferramentas de
  analytics, nem no cliente, nem no servidor, nem nas Edge Functions.
- As consultas de postos DEVEM usar apenas a área visível do mapa (bounding box), nunca as
  coordenadas do usuário.
- Se a pessoa recusar a permissão de localização, o site DEVE continuar funcionando, com o mapa
  numa região padrão e com busca ou navegação manual.

**Justificativa**: saber onde alguém está é um dado pessoal sensível. O site só precisa dessa
informação para posicionar o mapa, então não há motivo para guardá-la.

### IV. TypeScript Estrito e MVVM

- O TypeScript DEVE estar em modo `strict`. O tipo `any` NÃO DEVE ser usado. Qualquer exceção
  DEVE ter um comentário justificando o uso, na mesma linha ou na linha anterior.
- **View**: componentes React apenas renderizam o que recebem e repassam eventos. Eles NÃO DEVEM
  chamar o Supabase, `fetch` ou `useQuery` diretamente e NÃO DEVEM calcular dados (variação,
  idade da coleta, filtros, ordenação, reação do Gasosinha).
- **ViewModel**: hooks construídos sobre TanStack Query DEVEM orquestrar a busca de dados, chamar
  as regras de negócio e expor à view o estado pronto para exibir (carregando, vazio, erro, dados).
- **Regras de negócio**: DEVEM ser funções puras e tipadas, sem I/O, sem React e sem Supabase,
  num diretório próprio que não importa código de UI nem de acesso a dados.
- O acesso a dados (cliente Supabase, consultas) DEVE ficar num módulo próprio, usado somente
  pelos viewmodels.

**Justificativa**: separar a exibição, a orquestração e as regras deixa cada parte testável
isoladamente e impede que regras de preço se espalhem pelos componentes.

### V. Teste Antes da Regra

- Toda função que transforma dado DEVE ter teste unitário escrito antes da implementação, e esse
  teste DEVE ser visto falhando antes do código que o faz passar. Isso inclui:
  - a leitura e a normalização de cada fonte;
  - a ligação entre preço e posto pelo CNPJ;
  - o cálculo da variação de preço;
  - o cálculo da idade da coleta;
  - a reação do Gasosinha ao preço.
- Os testes DEVEM cobrir o caso válido e pelo menos um caso inválido ou ausente (campo faltando,
  formato errado, CNPJ sem posto correspondente).
- Corrigir um bug numa dessas funções DEVE começar por um teste que reproduz o bug.

**Justificativa**: um erro nessas funções mostra preço errado para o posto errado, o que viola o
Princípio I. Escrever o teste primeiro fixa o comportamento esperado antes que o código o esconda.

### VI. Simples e de Custo Zero

- Toda a operação DEVE caber no plano gratuito do Supabase, da Vercel e do provedor de mapa.
- Serviço cobrado por requisição (tiles de mapa pagos, geocodificação, APIs comerciais) só entra
  com decisão explícita registrada no plan.md da feature. A decisão DEVE trazer a estimativa de
  uso, a cota gratuita e o que acontece quando a cota estourar.
- Cada nova dependência, serviço ou camada de infraestrutura DEVE ser justificada no plan.md. A
  alternativa mais simples vem primeiro.

**Justificativa**: o projeto não tem receita. Uma conta surpresa ou uma infraestrutura que ninguém
consegue manter acaba com ele mais rápido que qualquer bug.

### VII. Acessível e Mobile-First

- Texto e componentes de interface DEVEM atender ao contraste WCAG AA: 4,5:1 para texto normal e
  3:1 para texto grande e elementos gráficos de interface.
- Toda funcionalidade DEVE ser operável por teclado, com foco sempre visível.
- DEVE existir uma lista de postos como alternativa ao mapa, com as mesmas informações (preço,
  data, fonte e variação) e os mesmos filtros.
- A informação NÃO DEVE depender apenas de cor ou de animação.
- As animações do Gasosinha DEVEM respeitar `prefers-reduced-motion`. Com `reduce` ativo, elas são
  removidas ou trocadas por um estado estático.
- Os layouts DEVEM ser projetados primeiro para telas de celular e depois ampliados.

**Justificativa**: a maioria das pessoas consulta preço de combustível no celular, muitas vezes na
rua. Um mapa sozinho exclui quem usa leitor de tela ou teclado.

### VIII. Formato Brasileiro

- Toda a interface DEVE estar em português do Brasil, com `lang="pt-BR"` no documento.
- Valores monetários DEVEM ser exibidos em reais, com vírgula decimal (ex.: R$ 6,59).
- Datas DEVEM ser exibidas como dd/mm/aaaa e interpretadas no fuso `America/Sao_Paulo`, para que
  uma coleta não apareça com a data do dia anterior.
- A formatação de moeda e de data DEVE ficar num único módulo. Nenhum outro módulo DEVE formatar
  esses valores por conta própria.

**Justificativa**: o público é brasileiro. Um formato estrangeiro ou uma data deslocada pelo fuso
gera desconfiança no dado (Princípio I).

### IX. Vibecoding com Revisão

- O agente de IA escreve o código. Mudanças nas áreas sensíveis só entram depois de revisão humana
  do diff e com os testes passando. As áreas sensíveis são:
  - migrations;
  - políticas de RLS;
  - Edge Functions;
  - importadores de dados.
- O agente NÃO DEVE aplicar migrations no banco remoto, fazer deploy de Edge Functions ou rodar
  importadores contra o banco de produção sem aprovação humana explícita para aquela ação.
- Fora das áreas sensíveis, o código gerado segue os Quality Gates comuns.

**Justificativa**: as áreas sensíveis definem quem pode escrever no banco e qual dado vira preço
na tela. Um erro ali viola os Princípios I e II de uma vez e pode não ter volta.

## Restrições Técnicas

- **Stack base**: Next.js (App Router), React, TypeScript e Tailwind CSS no front; Supabase
  (Postgres, RLS e Edge Functions) no backend; hospedagem na Vercel; TanStack Query nos
  viewmodels.
- Antes de escrever código que depende do Next.js, a documentação da versão instalada
  (`node_modules/next/dist/docs/`) DEVE ser consultada, conforme o `AGENTS.md`.
- A validação de schema de dados externos (Princípio I) DEVE usar uma única biblioteca no projeto
  inteiro, escolhida no primeiro plan.md.
- As regras de negócio puras (Princípio IV) e o módulo de formatação (Princípio VIII) DEVEM ficar
  em diretórios próprios, sem importar código de UI ou de acesso a dados.

## Fluxo de Desenvolvimento e Quality Gates

- Nenhuma mudança DEVE ser integrada sem passar em: verificação de tipos (`tsc --noEmit`), lint e
  testes unitários.
- Mudanças nas áreas sensíveis do Princípio IX DEVEM ter revisão humana do diff registrada (no
  pull request ou na conversa com o agente) antes de serem integradas ou aplicadas.
- Toda revisão DEVE conferir, no mínimo:
  - se todo preço exibido tem data e fonte;
  - se algum segredo vazou para o cliente;
  - se toda tabela tem RLS de só leitura;
  - se a posição do usuário aparece em algum armazenamento ou log;
  - se há regra de negócio dentro de componente.
- Toda tela nova DEVE ser conferida quanto a:
  - layout no celular;
  - navegação por teclado;
  - contraste;
  - `prefers-reduced-motion`;
  - estados de carregamento, vazio, erro e "sem preço".

## Governança

- Esta constituição prevalece sobre qualquer outra prática, convenção ou preferência do projeto.
  Em caso de conflito, ela vence.
- A constituição só muda via `/speckit-constitution`. Toda alteração DEVE atualizar a versão e a
  data da última alteração, seguindo versionamento semântico:
  - MAJOR: remoção ou redefinição incompatível de um princípio ou de uma regra de governança.
  - MINOR: princípio ou seção nova, ou expansão material de uma orientação existente.
  - PATCH: esclarecimentos, ajustes de redação e correções sem mudança de sentido.
- O plan.md de cada feature DEVE passar no Constitution Check antes da fase de pesquisa e de novo
  depois do design. Qualquer violação DEVE ser justificada no próprio plano, com a alternativa
  mais simples que foi rejeitada e o motivo.
- Decisões que o Princípio VI exige registrar (serviços pagos, dependências novas) DEVEM constar no
  plan.md antes da implementação.

**Version**: 1.1.0 | **Ratified**: 2026-10-27 | **Last Amended**: 2026-11-02
