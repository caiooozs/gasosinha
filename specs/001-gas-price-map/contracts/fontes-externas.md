# Contrato: o que se espera das fontes externas (entrada validada)

Estes são os formatos que o sistema **aceita**. Qualquer desvio é tratado como registro
rejeitado ou como falha da fonte, nunca corrigido por palpite (Princípio I e FR-023). Os schemas
Zod ficam em `supabase/functions/_shared/schemas.ts` e são testados com amostras reais (fixtures
recortadas dos arquivos baixados em 27/10/2026).

## API Revendedores da ANP (`/v1/combustivel`)

**Envelope (`EnvelopeRevendedores`)**:
- `succeeded` é `true`;
- `data` é um array, que pode faltar na página além da última;
- `searchPageFilter` traz `totalPagina` (inteiro ≥ 0) e `totalRegistro` (inteiro ≥ 0).

Envelope inválido é **falha da fonte** (422).

**Registro (`RevendedorAnp`)**: os campos usados e as regras de cada um.

| Campo | Regra | Se inválido |
|---|---|---|
| `cnpj` | string; aplicar `normalizarCnpj` (dígitos verificadores válidos) | rejeita o registro |
| `razaoSocial` | string não vazia | rejeita |
| `uf` | igual a `PE` | ignora (fora da região) |
| `municipio` | o nome normalizado está entre os 15 da RMR | ignora (fora da região) |
| `endereco`, `complemento`, `bairro`, `cep` | string, pode ser vazia; o CEP fica só com dígitos (8) | o CEP inválido vira `null` |
| `distribuidora` | string, pode ser vazia | vazia vira `null` |
| `latitude`, `longitude` | string decimal, ou vazia | vazia ou fora da RMR vira `localizacao = null` e conta em `localizacao_invalida` |
| `estimativaAcuracia`, `origemInformacao` | string, pode ser vazia | guardado como veio |

Os demais campos são ignorados no MVP.

## Arquivo semanal do LPC (`revendas_lpc*.xlsx`)

**Descoberta**: os links `href` da página "últimas semanas pesquisadas" que casam com
`/arquivos-lpc/\d{4}/revendas[^"]*\.xlsx$`. O nome do arquivo **não** é usado para inferir a
semana.

**Estrutura (`ArquivoLpc`)**:

- O arquivo é um XLSX com a aba `xl/worksheets/sheet1.xml` e, se houver, `xl/sharedStrings.xml`.
- **`PERÍODO`**: está numa linha de metadados, no formato `^PERÍODO: (\d{2}/\d{2}/\d{4}) A
  (\d{2}/\d{2}/\d{4})$`. Se faltar, é falha da fonte.
- **Cabeçalho**: é a primeira linha cuja coluna A vale `CNPJ`. Ela precisa conter
  `CNPJ`, `MUNICÍPIO`, `ESTADO`, `PRODUTO`, `UNIDADE DE MEDIDA`, `PREÇO DE REVENDA` e `DATA DA
  COLETA`. Se faltar coluna, é falha da fonte.
- **Mapeamento por nome**: as colunas são lidas pelo **nome no cabeçalho**, não pela letra.

**Linha (`LinhaLpc`)**, aplicada só às linhas de `ESTADO = PERNAMBUCO`, município da RMR e
`PRODUTO = GASOLINA COMUM`. As demais são ignoradas sem contar como rejeição.

| Coluna | Regra | Se inválido |
|---|---|---|
| `CNPJ` | número ou string; aplicar `normalizarCnpj` (completa zeros até 14 e valida os dígitos verificadores) | rejeita (`cnpj_invalido`) |
| `UNIDADE DE MEDIDA` | igual a `R$ / litro` | rejeita (`unidade_inesperada`) |
| `PREÇO DE REVENDA` | aplicar `canonicalizarPreco` (decimal; só aceita artefato de float até 10⁻⁹; 0 < p < 50) | rejeita (`preco_invalido`) |
| `DATA DA COLETA` | inteiro (serial do Excel, base 1899-12-30) **ou** `dd/mm/aaaa`; precisa cair dentro do `PERÍODO` | rejeita (`data_fora_do_periodo`) |

**Duplicidade**: o mesmo `(cnpj, data)` com preços diferentes no mesmo arquivo leva à rejeição
das duas linhas (`conflito_mesma_data`). Com o mesmo preço, as duas linhas contam como uma só.

## Série histórica semestral (`ca-AAAA-0S.zip`): plano B, não implementado

Fica documentada caso o relatório da carga mostre semanas faltando (R7):

- CSV com `;`, UTF-8 com BOM;
- CNPJ com máscara e espaço inicial;
- produto `GASOLINA`;
- data `dd/mm/aaaa`;
- preço com vírgula.

Usar essa fonte exigiria um schema próprio, `LinhaSerieHistorica`, com decisão registrada.
