/**
 * Descoberta e leitura do arquivo semanal do LPC (T028).
 *
 * - `extrairLinksLpc`: os links dos arquivos "revendas" na página da ANP (R3).
 * - `selecionarLinksPendentes`: quais baixar nesta execução, dentro da janela de 12 meses.
 * - `parseArquivoLpc`: as linhas de gasolina comum da RMR, validadas, a partir do lerPlanilha.
 */
import type { Periodo } from "./data-serial.ts";
import { dataBrParaIso } from "./data-serial.ts";
import { FormatoInesperadoError } from "./erros.ts";
import { ehMunicipioRmr, normalizarNomeMunicipio } from "./regiao-rmr.ts";
import { criarSchemaLinhaLpc, motivoDoErro, type LinhaLpcValida, type MotivoRejeicaoLpc } from "./schemas.ts";
import type { LinhaPlanilha } from "./xlsx.ts";

export { FormatoInesperadoError } from "./erros.ts";
export type { LinhaLpcValida, MotivoRejeicaoLpc } from "./schemas.ts";

const PADRAO_REVENDAS = /\/arquivos-lpc\/\d{4}\/revendas[^"'\s]*\.xlsx$/;
const ANO_DO_CAMINHO = /\/arquivos-lpc\/(\d{4})\//;

/** As URLs absolutas dos arquivos "revendas" na página, na ordem e sem duplicatas. */
export function extrairLinksLpc(html: string): string[] {
  const links: string[] = [];
  const vistos = new Set<string>();
  const regex = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  for (let m = regex.exec(html); m; m = regex.exec(html)) {
    const url = (m[1] ?? m[2] ?? "").trim().replace(/&amp;/g, "&");
    if (!/^https?:\/\//i.test(url) || !PADRAO_REVENDAS.test(url) || vistos.has(url)) continue;
    vistos.add(url);
    links.push(url);
  }
  return links;
}

/**
 * Os links a baixar: sem os que já tiveram desfecho (`urlsVistas`, de links_lpc), só dos anos a
 * partir de `anoMinimo`, do ano mais novo para o mais antigo (na ordem da página dentro do ano),
 * no máximo `limite`.
 */
export function selecionarLinksPendentes(
  links: readonly string[],
  urlsVistas: ReadonlySet<string>,
  anoMinimo: number,
  limite: number,
): string[] {
  return links
    .map((url, ordem) => ({ url, ordem, ano: Number(ANO_DO_CAMINHO.exec(url)?.[1]) }))
    .filter((l) => Number.isInteger(l.ano) && l.ano >= anoMinimo && !urlsVistas.has(l.url))
    .sort((a, b) => b.ano - a.ano || a.ordem - b.ordem)
    .slice(0, Number.isFinite(limite) ? limite : undefined)
    .map((l) => l.url);
}

export type ResultadoLpc = {
  periodo: Periodo;
  validas: LinhaLpcValida[];
  rejeitadas: { motivo: MotivoRejeicaoLpc; linha: number }[];
  ignoradas: number;
  /** Linhas de dados depois do cabeçalho. */
  linhas: number;
  /** Linhas de gasolina comum de PE na RMR (válidas ou rejeitadas). */
  naRegiao: number;
};

const REGEX_PERIODO = /^PERÍODO:\s*(\d{2}\/\d{2}\/\d{4})\s+A\s+(\d{2}\/\d{2}\/\d{4})$/;
const COLUNAS = {
  cnpj: "CNPJ",
  municipio: "MUNICÍPIO",
  estado: "ESTADO",
  produto: "PRODUTO",
  unidade: "UNIDADE DE MEDIDA",
  preco: "PREÇO DE REVENDA",
  data: "DATA DA COLETA",
} as const;
type Coluna = keyof typeof COLUNAS;

function lerPeriodo(linhas: readonly LinhaPlanilha[]): Periodo {
  for (const linha of linhas) {
    const m = REGEX_PERIODO.exec((linha.A ?? "").trim());
    if (!m) continue;
    const inicio = dataBrParaIso(m[1]);
    const fim = dataBrParaIso(m[2]);
    if (inicio && fim && inicio <= fim) return { inicio, fim };
    throw new FormatoInesperadoError("periodo_invalido", `${m[1]} A ${m[2]}`);
  }
  throw new FormatoInesperadoError("periodo_ausente", "nenhuma linha \"PERÍODO: dd/mm/aaaa A dd/mm/aaaa\"");
}

function mapearColunas(cabecalho: LinhaPlanilha): Record<Coluna, string> {
  const letraPorNome = new Map<string, string>();
  for (const [letra, valor] of Object.entries(cabecalho)) if (valor) letraPorNome.set(valor.trim(), letra);
  const mapa = {} as Record<Coluna, string>;
  for (const [chave, nome] of Object.entries(COLUNAS) as [Coluna, string][]) {
    const letra = letraPorNome.get(nome);
    if (!letra) throw new FormatoInesperadoError("coluna_ausente", nome);
    mapa[chave] = letra;
  }
  return mapa;
}

export function parseArquivoLpc(linhas: readonly LinhaPlanilha[]): ResultadoLpc {
  const indiceCabecalho = linhas.findIndex((l) => (l.A ?? "").trim() === "CNPJ");
  const periodo = lerPeriodo(indiceCabecalho >= 0 ? linhas.slice(0, indiceCabecalho) : linhas);
  if (indiceCabecalho < 0) throw new FormatoInesperadoError("cabecalho_ausente", "nenhuma linha com A = \"CNPJ\"");
  const col = mapearColunas(linhas[indiceCabecalho]);
  const schema = criarSchemaLinhaLpc(periodo);

  const candidatas: LinhaLpcValida[] = [];
  const rejeitadas: ResultadoLpc["rejeitadas"] = [];
  let ignoradas = 0;
  let naRegiao = 0;

  for (let i = indiceCabecalho + 1; i < linhas.length; i++) {
    const l = linhas[i];
    const estado = normalizarNomeMunicipio(l[col.estado] ?? "");
    const produto = (l[col.produto] ?? "").trim().toUpperCase();
    if (estado !== "PERNAMBUCO" || !ehMunicipioRmr(l[col.municipio] ?? "") || produto !== "GASOLINA COMUM") {
      ignoradas++;
      continue;
    }
    naRegiao++;
    const r = schema.safeParse({
      cnpj: l[col.cnpj] ?? null,
      municipio: l[col.municipio] ?? null,
      unidade: l[col.unidade] ?? null,
      preco: l[col.preco] ?? null,
      data: l[col.data] ?? null,
    });
    if (r.success) candidatas.push({ linha: i + 1, ...r.data });
    else rejeitadas.push({ motivo: motivoDoErro(r.error, "preco_invalido") as MotivoRejeicaoLpc, linha: i + 1 });
  }

  // Mesmo posto e data: com o mesmo preço vira uma linha só; com preços diferentes, nenhuma entra.
  const porChave = new Map<string, LinhaLpcValida[]>();
  for (const c of candidatas) {
    const chave = `${c.cnpj}|${c.dataColeta}`;
    porChave.set(chave, [...(porChave.get(chave) ?? []), c]);
  }
  const validas: LinhaLpcValida[] = [];
  for (const grupo of porChave.values()) {
    if (grupo.every((c) => c.precoMilesimos === grupo[0].precoMilesimos)) validas.push(grupo[0]);
    else for (const c of grupo) rejeitadas.push({ motivo: "conflito_mesma_data", linha: c.linha });
  }

  validas.sort((a, b) => a.linha - b.linha);
  rejeitadas.sort((a, b) => a.linha - b.linha);
  return { periodo, validas, rejeitadas, ignoradas, linhas: linhas.length - indiceCabecalho - 1, naRegiao };
}
