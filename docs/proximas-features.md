# Próximas features: estudo (13/11/2026)

Feedback recolhido depois do deploy da feature 001. Por enquanto é só estudo: nada foi
implementado. Cada frente vira uma feature do Spec Kit (`/speckit-specify`). A comunidade vem
depois de uma emenda da constitution (`/speckit-constitution`).

## Ordem sugerida

1. **Feature 002: outros combustíveis e melhoria dos dados oficiais.** É de baixo risco: os dados
   já chegam no LPC e hoje são descartados. Também é a base da comunidade, porque o usuário
   informa o preço de um combustível específico.
2. **Emenda da constitution e feature 003: aba de comunidade** (comentários, estrelas e preço
   informado pelo usuário).

## 1. Melhorar a forma de pegar os dados dos postos

### Como é hoje

- **Cadastro da ANP (API Revendedores):** os 403 postos da RMR, uma vez por semana.
- **LPC semanal (pesquisa por amostragem):** na semana de 18 a 24/10/2026, só 81 postos da RMR
  tinham gasolina comum, cerca de 20%. É uma coleta por semana, e o sistema já a pega no dia em
  que sai.
- **Série histórica (CSV semestral):** plano B e carga do passado.
- **O limite está na fonte.** O preço que muda logo depois da pesquisa só aparece na semana
  seguinte, e só se o posto cair de novo na amostra.

### O que dá para melhorar

- **Importar todos os produtos do LPC.** A planilha já traz `GASOLINA COMUM`, `GASOLINA ADITIVADA`,
  `ETANOL`, `DIESEL S10`, `DIESEL S500`, `GNV` e `GLP`. Hoje o parser (`supabase/functions/_shared/lpc.ts`)
  descarta tudo que não é gasolina comum.
- **Usar o `produtos[]` do cadastro.** Ele diz quais combustíveis cada posto vende, com a
  tancagem e o número de bicos. A tela poderia distinguir "vende etanol, mas está sem preço" de
  "não vende etanol".
- **Menor Preço (Sefaz-PE):**
  - usa as notas fiscais (NFC-e) e mostra preços quase em tempo real de gasolina, etanol e diesel;
  - seria a melhor fonte oficial, mas não achei API pública (nem dele nem dos apps de outros
    estados, como o Preço da Hora e o Abasteça+);
  - usar a API interna do app seria frágil e arriscado juridicamente;
  - o caminho é pedir os dados à Sefaz-PE (Lei de Acesso à Informação ou parceria). É um item
    para o research.md da feature.

## 2. Outros combustíveis

### O que muda

- **Banco:**
  - liberar os produtos no `check (produto = 'gasolina_comum')` da tabela `precos`;
  - passar o combustível como parâmetro nos RPCs `postos_na_area` e `detalhe_posto`.
- **Ingestão:** mapear os produtos do LPC, do cadastro e do CSV semestral para os tipos canônicos
  (hoje só existe `gasolina_comum`).
- **Tela:**
  - um seletor de combustível (Comum, Aditivada, Etanol, Diesel S10, Diesel S500, GNV), lembrado
    no navegador;
  - marcadores, lista, régua, "mais barato" e reação do Gasosinha passam a valer para o
    combustível escolhido;
  - no detalhe, uma tabela com todos os combustíveis do posto, cada um com data, fonte e histórico;
  - nomes acessíveis com o combustível (ex.: "etanol R$ 4,59 há 3 d").
- **Histórico:** a série semestral também tem todos os produtos, então dá para recarregar o
  passado. É uma carga em produção e precisa de aprovação.

### Limites

- **"Gasolina melhor":** o LPC só tem a categoria "aditivada". As premium (Podium, V-Power) não
  vêm separadas; só a comunidade cobriria essas.
- **GLP:** é o botijão de cozinha. A sugestão é deixar de fora.
- **Cobertura:** menos postos têm preço de diesel e de GNV, então o "sem preço" vai aparecer mais.
- **"Etanol compensa?" (regra dos 70%):** é uma boa ideia para o Gasosinha. Pelo Princípio I, só
  pode comparar coletas reais do mesmo posto e da mesma data.

## 3. Aba de comunidade

Comentário, avaliação em estrelas e preço visto no posto. O motivo: alguns postos mudam o preço
logo depois da pesquisa, e a pessoa fica sem a informação real.

### Conflitos com o que está escrito

- A spec 001 deixou de fora "preço informado por usuários" e "login, favoritos e alertas".
- O plano diz "RLS: select público; escrita só pela service role", e a service role não pode ir
  para a Vercel.
- O Princípio I exige fonte e data em todo preço.
- Por isso, antes da spec, a constitution precisa de uma emenda (`/speckit-constitution`):
  - o preço da comunidade tem fonte "informado por usuário" e a data é a hora do envio;
  - ele nunca substitui nem se mistura com o preço da ANP;
  - regras de moderação;
  - LGPD: política de privacidade, dados mínimos e opção de apagar a conta e os dados.

### Preço informado pelo usuário

- **O que guardar:** posto, combustível, preço com 3 casas (como na bomba) e a hora registrada
  pelo servidor, não a do aparelho.
- **Para dar confiança:**
  - rejeitar valores fora de uma faixa plausível em relação aos preços oficiais da área para
    aquele combustível;
  - limitar envios por pessoa, posto e combustível em um intervalo, e um teto por dia;
  - outros usuários confirmam com "ainda está esse preço?", e a tela mostra "confirmado por N
    pessoas";
  - o preço vence depois de algumas horas ou dias e deixa de aparecer como atual;
- **Foto da placa:** fica para depois. Custa armazenamento e pode mostrar rosto ou placa de carro.

### Estrelas

- Uma avaliação de 1 a 5 por pessoa e por posto, que ela pode mudar.
- A média só aparece a partir de umas 3 avaliações, junto com a quantidade.
- Ideia para depois: critérios separados (atendimento, banheiro, calibrador).

### Comentários

- Texto curto (cerca de 500 caracteres), sem links, com apelido.
- Quem comenta pode editar e apagar o próprio comentário.
- Botão "denunciar"; depois de N denúncias, o comentário fica escondido até revisão.
- Fila de moderação para o dono do projeto (página de admin ou o painel do Supabase).
- Filtro de palavrões em pt-BR.

### Identidade e abuso

- **Login para escrever; ler continua aberto, sem login.** Sem identidade, as estrelas viram
  briga: o dono de posto se dá 5 e dá 1 ao concorrente.
- Supabase Auth, com Google e/ou link por e-mail.
- Captcha gratuito (Cloudflare Turnstile) só no envio.
- Tabela de usuários bloqueados.

### Técnica e custo

- O envio passa por uma Server Action ou Route Handler do Next, que confere o captcha (segredo só
  no servidor, Princípio II), valida com zod e grava com a sessão do próprio usuário, sob RLS. A
  service role continua fora da Vercel. A alternativa é uma Edge Function do Supabase.
- As páginas dos postos continuam pré-renderizadas. O conteúdo da comunidade é buscado no
  navegador com TanStack Query.
- **Cabe no plano gratuito (Princípio VI):**
  - Supabase Auth: até 50 mil usuários ativos por mês;
  - banco: 500 MB;
  - Edge Functions: 500 mil chamadas por mês;
  - Turnstile: gratuito.

### Jurídico

- **Marco Civil da Internet (art. 19):** o site só responde pelo conteúdo do usuário se descumprir
  ordem judicial.
- Mesmo assim, comentário sobre empresa pede termos de uso, política de privacidade e um canal de
  remoção.

### Tela

- No detalhe do posto, duas abas: "Preços" e "Comunidade".
- A aba Comunidade mostra:
  - o resumo das estrelas;
  - os preços recentes da comunidade, com o botão de confirmar;
  - os comentários;
  - os botões "informar preço" e "avaliar".
- O Gasosinha pode reagir quando a comunidade viu um preço diferente do da ANP.

## Decisões em aberto (do usuário)

1. Login obrigatório para escrever? Com Google, e-mail ou os dois?
2. O preço da comunidade aparece no marcador (com um ícone que diferencie a fonte) ou só no
   detalhe?
3. Por quanto tempo um preço da comunidade vale?
4. Comentários aparecem na hora (moderação depois) ou só depois de aprovados?
5. Quais combustíveis entram? A gasolina premium fica só pela comunidade?
6. Vale tentar pedir os dados do Menor Preço à Sefaz-PE?

## Fontes consultadas

- [Sefaz-PE orienta a comparar preços de combustíveis com o app Menor Preço](https://www.sefaz.pe.gov.br/Noticias/Paginas/Sefaz-PE-orienta-contribuintes-a-comparar-pre%C3%A7os-de-combust%C3%ADveis-com-o-aplicativo-Menor-Pre%C3%A7o.aspx)
- [Sefaz-PE disponibiliza aplicativo de pesquisa de preços](https://www.sefaz.pe.gov.br/Noticias/Paginas/Sefaz-PE-disponibiliza-aplicativo-de-pesquisa-de-pre%C3%A7os-ao-consumidor.aspx)
- [Menor Preço Brasil (governo do RS)](https://estado.rs.gov.br/desenvolvido-no-rs-aplicativo-menor-preco-brasil-ja-comparou-40-bilhoes-de-notas-fiscais-para-15-estados-e-df)
- [Abasteça+, de Goiás (NFC-e atualizada de hora em hora)](https://goias.gov.br/economia/perguntas-e-respostas-abasteca-mais/)
- `specs/001-gas-price-map/research.md`, seções da fonte LPC e do mapeamento de produto.
