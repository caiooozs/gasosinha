import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { FormatoInesperadoError, extrairLinksLpc, parseArquivoLpc, selecionarLinksPendentes } from "./lpc.ts";
import { lerPlanilha } from "./xlsx.ts";

const fixture = (nome: string) => readFileSync(fileURLToPath(new URL(`./fixtures/${nome}`, import.meta.url)));
const manifesto = JSON.parse(fixture("manifesto.json").toString("utf8")) as {
  paginaLpc: { linksRevendas: string[]; linkDuplicado: string };
  lpc: { linhas: { posicao: number; grupo: string; cnpjBruto: string; digitosCnpj: number }[] };
};

const BASE = "https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/arquivos-lpc";

describe("extrairLinksLpc", () => {
  const links = extrairLinksLpc(fixture("lpc-pagina-amostra.html").toString("utf8"));

  test("devolve os links revendas da página, na ordem e sem duplicatas", () => {
    expect(links).toEqual(manifesto.paginaLpc.linksRevendas);
    expect(links.filter((l) => l === manifesto.paginaLpc.linkDuplicado)).toHaveLength(1);
  });

  test("ignora os links que não são de revendas, como o resumo semanal", () => {
    expect(links.some((l) => /resumo/i.test(l))).toBe(false);
  });

  test("só devolve URLs absolutas", () => {
    const html =
      `<a href="/arquivos-lpc/2026/revendas_lpc_x.xlsx">rel</a>` +
      `<a href="${BASE}/2026/revendas_lpc_y.xlsx">abs</a>` +
      `<a href="${BASE}/2026/revendas_lpc_y.xlsx.bak">outro</a>`;
    expect(extrairLinksLpc(html)).toEqual([`${BASE}/2026/revendas_lpc_y.xlsx`]);
  });
});

describe("selecionarLinksPendentes", () => {
  const a25 = `${BASE}/2025/revendas_lpc_a.xlsx`;
  const x26 = `${BASE}/2026/revendas_lpc_x.xlsx`;
  const b25 = `${BASE}/2025/revendas_lpc_b.xlsx`;
  const y26 = `${BASE}/2026/revendas_lpc_y.xlsx`;
  const c24 = `${BASE}/2024/revendas_lpc_c.xlsx`;
  const pagina = [a25, x26, b25, y26, c24];

  test("ordena do ano mais novo para o mais antigo, mantendo a ordem da página dentro do ano", () => {
    expect(selecionarLinksPendentes(pagina, new Set(), 2024, Infinity)).toEqual([x26, y26, a25, b25, c24]);
  });

  test("descarta as URLs já vistas e mantém as que não têm desfecho (edição interrompida)", () => {
    expect(selecionarLinksPendentes(pagina, new Set([x26, a25]), 2024, Infinity)).toEqual([y26, b25, c24]);
  });

  test("descarta os anos anteriores ao início da janela", () => {
    expect(selecionarLinksPendentes(pagina, new Set(), 2025, Infinity)).toEqual([x26, y26, a25, b25]);
  });

  test("respeita o limite por execução", () => {
    expect(selecionarLinksPendentes(pagina, new Set(), 2024, 3)).toEqual([x26, y26, a25]);
  });

  test("ignora links sem o ano no caminho", () => {
    expect(selecionarLinksPendentes([`${BASE}/revendas_lpc.xlsx`, x26], new Set(), 2024, Infinity)).toEqual([x26]);
  });
});

describe("parseArquivoLpc com o recorte real", () => {
  const linhas = lerPlanilha(new Uint8Array(fixture("lpc-amostra.xlsx")));
  const resultado = parseArquivoLpc(linhas);
  const daRmr = manifesto.lpc.linhas.filter((l) => l.grupo.startsWith("rmr_gasolina_comum"));

  test("lê o PERÍODO", () => {
    expect(resultado.periodo).toEqual({ inicio: "2026-10-18", fim: "2026-10-24" });
  });

  test("mantém só gasolina comum de PE na RMR; o resto conta como ignorado", () => {
    expect(resultado.validas).toHaveLength(daRmr.length);
    expect(resultado.rejeitadas).toEqual([]);
    expect(resultado.ignoradas).toBe(40 - daRmr.length);
    expect(resultado.linhas).toBe(40);
    expect(resultado.naRegiao).toBe(daRmr.length);
  });

  test("completa o CNPJ de 12 e de 13 dígitos", () => {
    for (const l of daRmr.filter((x) => x.digitosCnpj < 14)) {
      const valida = resultado.validas.find((v) => v.linha === l.posicao);
      expect(valida?.cnpj).toBe(l.cnpjBruto.padStart(14, "0"));
    }
  });

  test("cada linha válida traz data no período, preço em milésimos e município normalizado", () => {
    for (const v of resultado.validas) {
      expect(v.dataColeta >= "2026-10-18" && v.dataColeta <= "2026-10-24").toBe(true);
      expect(Number.isInteger(v.precoMilesimos)).toBe(true);
      expect(v.preco).toMatch(/^\d+\.\d{3}$/);
      expect(v.municipio).toMatch(/^[A-Z ]+$/);
    }
  });
});

describe("parseArquivoLpc com linhas alteradas em memória", () => {
  const linhas = lerPlanilha(new Uint8Array(fixture("lpc-amostra.xlsx")));
  const posicaoRmr = manifesto.lpc.linhas.find((l) => l.grupo.startsWith("rmr_gasolina_comum"))?.posicao ?? 0;
  const linhaRmr = linhas[posicaoRmr - 1];
  const comLinhas = (...extras: Record<string, string | null>[]) => [...linhas.slice(0, 8), ...extras];

  test("canonicaliza o preço com artefato de float (valor real de outro estado)", () => {
    const r = parseArquivoLpc(comLinhas({ ...linhaRmr, N: "8.9700000000000006" }));
    expect(r.validas[0]).toMatchObject({ precoMilesimos: 8970, preco: "8.970" });
  });

  test("rejeita unidade, data, CNPJ e preço inválidos, com o motivo", () => {
    const r = parseArquivoLpc(
      comLinhas(
        { ...linhaRmr, M: "R$ / m³" },
        { ...linhaRmr, O: "46330" },
        { ...linhaRmr, A: "11694577000168" },
        { ...linhaRmr, N: "6.4891" },
      ),
    );
    expect(r.validas).toEqual([]);
    expect(r.rejeitadas.map((x) => x.motivo)).toEqual([
      "unidade_inesperada",
      "data_fora_do_periodo",
      "cnpj_invalido",
      "preco_invalido",
    ]);
    expect(r.rejeitadas.map((x) => x.linha)).toEqual([9, 10, 11, 12]);
  });

  test("aceita a data no formato dd/mm/aaaa", () => {
    const r = parseArquivoLpc(comLinhas({ ...linhaRmr, O: "20/10/2026" }));
    expect(r.validas[0].dataColeta).toBe("2026-10-20");
  });

  test("mesmo posto e data com preços diferentes: rejeita as duas linhas", () => {
    const r = parseArquivoLpc(comLinhas({ ...linhaRmr, N: "6.95" }, { ...linhaRmr, N: "6.99" }));
    expect(r.validas).toEqual([]);
    expect(r.rejeitadas).toEqual([
      { motivo: "conflito_mesma_data", linha: 9 },
      { motivo: "conflito_mesma_data", linha: 10 },
    ]);
  });

  test("mesmo posto e data com o mesmo preço: vira uma linha só", () => {
    const r = parseArquivoLpc(comLinhas({ ...linhaRmr }, { ...linhaRmr }));
    expect(r.validas).toHaveLength(1);
    expect(r.rejeitadas).toEqual([]);
  });
});

describe("parseArquivoLpc com planilhas montadas no teste", () => {
  const periodo = { A: "PERÍODO: 18/10/2026 A 24/10/2026" };

  test("lê as colunas pelo nome do cabeçalho, não pela letra", () => {
    const cabecalho = {
      A: "CNPJ",
      B: "PREÇO DE REVENDA",
      C: "DATA DA COLETA",
      D: "PRODUTO",
      E: "ESTADO",
      F: "UNIDADE DE MEDIDA",
      G: "MUNICÍPIO",
    };
    const dado = {
      A: "11694577000167",
      B: "6.59",
      C: "46314",
      D: "GASOLINA COMUM",
      E: "PERNAMBUCO",
      F: "R$ / litro",
      G: "RECIFE",
    };
    const r = parseArquivoLpc([periodo, cabecalho, dado]);
    expect(r.validas).toEqual([
      {
        linha: 3,
        cnpj: "11694577000167",
        dataColeta: "2026-10-19",
        precoMilesimos: 6590,
        preco: "6.590",
        municipio: "RECIFE",
      },
    ]);
  });

  test("coluna obrigatória ausente lança FormatoInesperadoError", () => {
    const cabecalho = { A: "CNPJ", B: "MUNICÍPIO", C: "ESTADO", D: "PRODUTO", E: "PREÇO DE REVENDA", F: "DATA DA COLETA" };
    expect(() => parseArquivoLpc([periodo, cabecalho])).toThrow(FormatoInesperadoError);
  });

  test("PERÍODO ausente lança FormatoInesperadoError", () => {
    expect(() => parseArquivoLpc([{ A: "CNPJ" }])).toThrow(FormatoInesperadoError);
  });

  test("cabeçalho ausente lança FormatoInesperadoError", () => {
    expect(() => parseArquivoLpc([periodo, { A: "OUTRA COISA" }])).toThrow(FormatoInesperadoError);
  });
});
