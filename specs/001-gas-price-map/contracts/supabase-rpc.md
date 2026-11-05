# Contrato: leituras públicas no Supabase (RPCs e tabela pública)

O navegador e o servidor Next fazem estas leituras com a chave pública (anon ou publishable).
Todas são somente leitura e passam pela RLS (Princípio II).

## `postos_na_area(oeste, sul, leste, norte)`: postos da área visível (P1)

**Chamada**: `supabase.rpc('postos_na_area', { oeste, sul, leste, norte })`

**Entrada**:

| Parâmetro | Tipo | Regras |
|---|---|---|
| `oeste`, `sul`, `leste`, `norte` | `double precision` | Precisam ser múltiplos de 0,02, ou seja, a área já quantizada por `quantizarBbox` (R13). Exige `oeste < leste` e `sul < norte`. Se a área for maior que o retângulo da RMR com margem, ela é recortada a ele. |

O RPC **não recebe nenhum outro dado**. Em particular, nunca recebe a posição da pessoa
(Princípio III).

**Saída**: uma lista, ordenada por `cnpj` (a ordem de exibição é decidida no front pelo FR-011).
Inclui apenas postos com `ativo = true` e `localizacao` não nula, dentro da área.

| Campo | Tipo | Observação |
|---|---|---|
| `cnpj` | `text` (14) | |
| `nome` | `text` | `razao_social` |
| `bandeira` | `text \| null` | |
| `municipio` | `text` | Nome normalizado. |
| `lat`, `lng` | `double precision` | |
| `preco_atual` | `numeric \| null` | Coleta de gasolina comum mais recente. |
| `data_atual` | `date \| null` | |
| `preco_anterior` | `numeric \| null` | A coleta imediatamente anterior à atual. |
| `data_anterior` | `date \| null` | |
| `fonte` | `text \| null` | Fonte da coleta atual. |

**Desempenho**: no pior caso (a RMR inteira) são 403 linhas, cerca de 100 KB sem compressão.
Usa o índice GiST de `postos.localizacao` e o índice único de `precos`, com `LATERAL ... LIMIT 2`.

## `detalhe_posto(p_cnpj)`: detalhe e histórico (P2 e P3)

**Chamada**: `supabase.rpc('detalhe_posto', { p_cnpj })`

**Entrada**: `p_cnpj` (`text`, 14 dígitos). Outro formato devolve `null`.

**Saída**: `null` se o CNPJ não existir em `postos`, e então a página mostra "posto não
encontrado". Caso contrário, devolve um JSON:

```json
{
  "cnpj": "11694577000167",
  "nome": "IGUEP INCORPORADORA GUEDES PEREIRA LTDA",
  "bandeira": "VIBRA",
  "endereco": "AVENIDA ENG ABDIAS DE CARVALHO, 1142",
  "bairro": "PRADO",
  "municipio": "RECIFE",
  "lat": -8.06246,
  "lng": -34.91138,
  "ativo": true,
  "coletas": [
    { "data": "2026-10-20", "preco": 6.59, "fonte": "ANP – Levantamento de Preços de Combustíveis" },
    { "data": "2026-10-13", "preco": 6.49, "fonte": "ANP – Levantamento de Preços de Combustíveis" }
  ]
}
```

**Regras**:
- `coletas` vem da mais recente para a mais antiga, com todo o histórico guardado (FR-014 e
  FR-017).
- Postos inativos também são devolvidos, com `ativo: false`, para o caso de alguém abrir um link
  antigo.

## Tabela `estado_fontes`: aviso de fonte com problema (FR-027)

**Chamada**: `supabase.from('estado_fontes').select('fonte, ultima_ok_em, ultima_edicao_fim,
em_problema, tipo_problema, problema_desde')`

**Saída**: duas linhas, `cadastro` e `precos`. O front aplica `avaliarStatus(estado, hoje)` para
decidir se mostra o aviso e qual data exibir.

## Erros

Em qualquer erro de rede ou do PostgREST, o viewmodel expõe o estado `erro`, e a view mostra uma
mensagem com a opção "tentar de novo". Os dados que já estavam em cache no TanStack Query
continuam visíveis.
