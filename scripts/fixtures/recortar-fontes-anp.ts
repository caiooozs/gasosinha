/**
 * Recorta as fontes reais da ANP em fixtures pequenas para os testes do domínio da ingestão (T009).
 *
 * ÁREA SENSÍVEL (Princípio IX): as fixtures definem o que os testes tratam como "dado real da ANP".
 * O diff passa por revisão humana antes de entrar.
 *
 * Baixa, só para leitura, três fontes públicas:
 *   - a API Revendedores (uf=PE);
 *   - a página "últimas semanas pesquisadas" do LPC;
 *   - o arquivo semanal revendas_lpc_2026_10_18-2026_10_24.xlsx.
 *
 * E grava em supabase/functions/_shared/fixtures/:
 *   - revendedores-pe-amostra.json: o envelope da API com 12 registros;
 *   - lpc-amostra.xlsx: o XLSX semanal com as 8 linhas iniciais e 40 linhas de dados;
 *   - lpc-pagina-amostra.html: um trecho da página com os links dos arquivos;
 *   - manifesto.json: o que cada fixture contém e por quê, para orientar os testes da Fase 2.
 *
 * Nenhum valor de dado é alterado. A única mudança de formato está documentada no manifesto:
 * uma célula de texto do XLSX vira `inlineStr`, com o mesmo texto.
 *
 * Uso, na raiz do repositório: npx tsx scripts/fixtures/recortar-fontes-anp.ts
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from "fflate";

const URL_API = "https://revendedoresapi.anp.gov.br/v1/combustivel?uf=PE&numeropagina=1";
const URL_PAGINA_LPC =
  "https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas";
const ARQUIVO_SEMANA = "revendas_lpc_2026_10_18-2026_10_24.xlsx";
const CNPJ_SEM_COORDENADA = "05648920000134";
const CABECALHO_HTTP = { "User-Agent": "Gasosinha/1.0 (geracao de fixtures de teste)" };
// Data fixa nas entradas do ZIP, para o arquivo não mudar a cada execução sem mudança de dado.
const MTIME_ZIP = new Date("2026-10-26T00:00:00Z");

// Cópia local dos 15 municípios da RMR. A fonte única (_shared/regiao-rmr.ts) só nasce no T024.
const MUNICIPIOS_RMR = new Set([
  "ABREU E LIMA",
  "ARACOIABA",
  "CABO DE SANTO AGOSTINHO",
  "CAMARAGIBE",
  "GOIANA",
  "IGARASSU",
  "ILHA DE ITAMARACA",
  "IPOJUCA",
  "ITAPISSUMA",
  "JABOATAO DOS GUARARAPES",
  "MORENO",
  "OLINDA",
  "PAULISTA",
  "RECIFE",
  "SAO LOURENCO DA MATA",
]);

const normalizar = (texto: string | null | undefined): string =>
  (texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .trim();

const decodificarXml = (texto: string): string =>
  texto
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

const escaparXml = (texto: string): string =>
  texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function baixar(url: string): Promise<Uint8Array> {
  const resposta = await fetch(url, { headers: CABECALHO_HTTP });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status} ao baixar ${url}`);
  return new Uint8Array(await resposta.arrayBuffer());
}

// --- API Revendedores ---

type RegistroApi = Record<string, unknown> & {
  cnpj: string;
  municipio: string;
  latitude: string;
  longitude: string;
  estimativaAcuracia: string;
  complemento: string;
  distribuidora: string;
};

type EnvelopeApi = Record<string, unknown> & {
  data?: RegistroApi[];
  searchPageFilter?: Record<string, unknown>;
};

type Escolha = { cnpj: string; municipio: string; motivo: string };

async function recortarRevendedores(): Promise<{ envelope: EnvelopeApi; escolhas: Escolha[] }> {
  const envelope = JSON.parse(strFromU8(await baixar(URL_API))) as EnvelopeApi;
  if (envelope.succeeded !== true || !Array.isArray(envelope.data)) {
    throw new Error("Envelope inesperado da API Revendedores (sem succeeded=true ou sem data).");
  }
  const dados = envelope.data;
  const ordenados = [...dados].sort((a, b) => a.cnpj.localeCompare(b.cnpj));
  const escolhidos = new Map<string, Escolha>();
  const temCoordenada = (r: RegistroApi) => r.latitude.trim() !== "" && r.longitude.trim() !== "";

  const escolher = (filtro: (r: RegistroApi) => boolean, motivo: string, quantidade = 1) => {
    let faltam = quantidade;
    for (const r of ordenados) {
      if (faltam === 0) break;
      if (escolhidos.has(r.cnpj) || !filtro(r)) continue;
      escolhidos.set(r.cnpj, { cnpj: r.cnpj, municipio: r.municipio, motivo });
      faltam--;
    }
    if (faltam > 0) throw new Error(`Nenhum registro da API atende: ${motivo}`);
  };

  escolher((r) => r.cnpj === CNPJ_SEM_COORDENADA, "RMR sem coordenada: localizacao null e localizacaoInvalida");
  escolher(
    (r) => r.municipio === "RECIFE" && temCoordenada(r) && r.estimativaAcuracia.trim() === "",
    "RMR com estimativaAcuracia vazia (posição declarada pelo posto)",
  );
  escolher(
    (r) => r.municipio === "RECIFE" && temCoordenada(r) && r.complemento.trim() !== "",
    "RMR com complemento: endereco e complemento unidos",
  );
  escolher(
    (r) => r.municipio === "RECIFE" && temCoordenada(r) && r.distribuidora === "BANDEIRA BRANCA",
    "RMR com bandeira branca",
  );
  escolher((r) => r.municipio === "RECIFE" && temCoordenada(r), "RMR (Recife)");
  escolher((r) => r.municipio === "OLINDA" && temCoordenada(r), "RMR (Olinda)", 2);
  escolher((r) => r.municipio === "JABOATAO DOS GUARARAPES" && temCoordenada(r), "RMR (Jaboatão dos Guararapes)", 3);
  escolher((r) => r.municipio === "CARUARU", "fora da RMR (Caruaru): deve ser ignorado");
  escolher((r) => r.municipio === "PETROLINA", "fora da RMR (Petrolina): deve ser ignorado");

  // Mantém a ordem original da API.
  const recorte = dados.filter((r) => escolhidos.has(r.cnpj));
  return {
    envelope: {
      ...envelope,
      data: recorte,
      searchPageFilter: { ...envelope.searchPageFilter, totalRegistro: recorte.length, totalPagina: 1 },
    },
    escolhas: recorte.map((r) => escolhidos.get(r.cnpj) as Escolha),
  };
}

// --- Página do LPC ---

const PADRAO_REVENDAS = /\/arquivos-lpc\/\d{4}\/revendas[^"]*\.xlsx$/;

async function recortarPagina(): Promise<{ html: string; links: string[]; duplicado: string; urlSemana: string }> {
  const html = strFromU8(await baixar(URL_PAGINA_LPC));
  const ancoras = [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*>[\s\S]*?<\/a>/g)].map((m, indice) => ({
    tag: m[0],
    href: m[1],
    indice,
  }));
  const revendas = ancoras.filter((a) => PADRAO_REVENDAS.test(a.href));
  const resumos = ancoras.filter((a) => /resumo_semanal/i.test(a.href)).slice(0, 2);

  const semana = revendas.find((a) => a.href.endsWith(`/${ARQUIVO_SEMANA}`));
  const semNumero = revendas.find((a) => a.href.endsWith("/revendas_lpc-1.xlsx"));
  if (!semana || !semNumero) {
    throw new Error(`A página do LPC não tem ${ARQUIVO_SEMANA} ou revendas_lpc-1.xlsx.`);
  }

  const escolhidas = new Map<number, (typeof ancoras)[number]>();
  const incluir = (a: (typeof ancoras)[number] | undefined) => {
    if (a) escolhidas.set(a.indice, a);
  };
  incluir(semana);
  incluir(semNumero);
  incluir(revendas.find((a) => a.href.endsWith("/revendas_lpc.xlsx")));
  incluir(revendas.find((a) => /revendas_lpc-\d{8}-a-\d{8}\.xlsx$/.test(a.href)));
  // Os dois primeiros links de cada ano, para os testes de seleção por ano.
  const anos = [...new Set(revendas.map((a) => /\/arquivos-lpc\/(\d{4})\//.exec(a.href)?.[1]))];
  for (const ano of anos) revendas.filter((a) => a.href.includes(`/arquivos-lpc/${ano}/`)).slice(0, 2).forEach(incluir);
  resumos.forEach(incluir);

  const ordem = [...escolhidas.values()].sort((a, b) => a.indice - b.indice);
  const links = ordem.filter((a) => PADRAO_REVENDAS.test(a.href)).map((a) => a.href);
  if (links.length < 6) throw new Error(`Só ${links.length} links revendas no recorte; o T017 pede pelo menos 6.`);

  const itens = ordem.map((a) => `      <li>${a.tag}</li>`);
  // O mesmo link duas vezes, para o teste "sem duplicatas" do extrairLinksLpc.
  itens.push(`      <li>${semana.tag}</li>`);
  const recorte = [
    `<!-- Trecho de ${URL_PAGINA_LPC}`,
    `     baixado em ${new Date().toISOString().slice(0, 10)} por scripts/fixtures/recortar-fontes-anp.ts. -->`,
    "<!doctype html>",
    '<html lang="pt-BR">',
    "  <body>",
    "    <ul>",
    ...itens,
    "    </ul>",
    "  </body>",
    "</html>",
    "",
  ].join("\n");
  return { html: recorte, links, duplicado: semana.href, urlSemana: semana.href };
}

// --- Arquivo semanal do LPC ---

type Celula = { coluna: string; atributos: string; interno: string; tipo?: string; valor?: string; xml: string };
type Linha = { numero: number; atributos: string; celulas: Celula[] };

type LinhaManifesto = {
  /** Posição (1-based) na lista que o lerPlanilha devolve, uma por <row>. */
  posicao: number;
  /** Atributo r da <row> no XLSX. */
  r: number;
  grupo: string;
  cnpjBruto: string;
  digitosCnpj: number;
  estado: string;
  municipio: string;
  produto: string;
  precoBruto: string;
};

function lerCelulas(corpo: string): Celula[] {
  return [...corpo.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)].map((m) => {
    const atributos = m[1];
    const interno = m[2] ?? "";
    return {
      coluna: /\br="([A-Z]+)\d+"/.exec(atributos)?.[1] ?? "",
      atributos,
      interno,
      tipo: /\bt="(\w+)"/.exec(atributos)?.[1],
      valor: /<v>([\s\S]*?)<\/v>/.exec(interno)?.[1],
      xml: m[0],
    };
  });
}

function recortarXlsx(bytes: Uint8Array): { xlsx: Uint8Array; periodo: string; linhas: LinhaManifesto[]; celulaInline: string } {
  const arquivos = unzipSync(bytes);
  const planilha = strFromU8(arquivos["xl/worksheets/sheet1.xml"]);
  const sstXml = strFromU8(arquivos["xl/sharedStrings.xml"]);
  const blocosSi = [...sstXml.matchAll(/<si\b[^>]*>[\s\S]*?<\/si>/g)].map((m) => m[0]);
  const textoSi = (indice: number) =>
    [...(blocosSi[indice] ?? "").matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => decodificarXml(m[1])).join("");
  const texto = (c: Celula | undefined) => {
    if (!c || c.valor === undefined) return "";
    return c.tipo === "s" ? textoSi(Number(c.valor)) : decodificarXml(c.valor);
  };

  const linhas: Linha[] = [...planilha.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)].map((m) => ({
    numero: Number(/\br="(\d+)"/.exec(m[1])?.[1]),
    atributos: m[1],
    celulas: lerCelulas(m[2]),
  }));
  const celula = (l: Linha, coluna: string) => l.celulas.find((c) => c.coluna === coluna);

  const indiceCabecalho = linhas.findIndex((l) => texto(celula(l, "A")) === "CNPJ");
  if (indiceCabecalho < 0) throw new Error("Cabeçalho (coluna A = CNPJ) não encontrado no XLSX.");
  const cabecalho = linhas[indiceCabecalho];
  const colunaDe = (nome: string) => {
    const c = cabecalho.celulas.find((x) => texto(x) === nome);
    if (!c) throw new Error(`Coluna "${nome}" ausente no cabeçalho.`);
    return c.coluna;
  };
  const col = {
    cnpj: colunaDe("CNPJ"),
    fantasia: colunaDe("FANTASIA"),
    municipio: colunaDe("MUNICÍPIO"),
    estado: colunaDe("ESTADO"),
    produto: colunaDe("PRODUTO"),
    preco: colunaDe("PREÇO DE REVENDA"),
  };
  const periodo = linhas
    .slice(0, indiceCabecalho)
    .map((l) => texto(celula(l, "A")))
    .find((t) => t.startsWith("PERÍODO:"));
  if (!periodo) throw new Error("Linha PERÍODO não encontrada nos metadados.");

  // Classifica as linhas de dados e escolhe 40, de forma determinística (ordem do arquivo).
  const temArtefato = (preco: string) => /\.\d{4,}/.test(preco);
  const cotas: Record<string, number> = {
    rmr_gasolina_comum_cnpj12: 2,
    rmr_gasolina_comum_cnpj13: 6,
    rmr_gasolina_comum_cnpj14: 12,
    rmr_gasolina_aditivada: 4,
    rmr_etanol: 2,
    pe_fora_da_rmr_gasolina_comum: 4,
    // Na semana de 18 a 24/10/2026 há só 1 linha de gasolina comum de outro estado com artefato.
    outro_estado_gasolina_comum_artefato_float: 1,
    outro_estado_outro_produto_artefato_float: 1,
    outro_estado_gasolina_comum: 4,
    outro_estado_outro_produto: 4,
  };
  const escolhidas: { linha: Linha; grupo: string }[] = [];
  for (const linha of linhas.slice(indiceCabecalho + 1)) {
    const estado = normalizar(texto(celula(linha, col.estado)));
    const municipio = normalizar(texto(celula(linha, col.municipio)));
    const produto = texto(celula(linha, col.produto));
    const preco = celula(linha, col.preco)?.valor ?? "";
    const digitos = texto(celula(linha, col.cnpj)).replace(/\D/g, "").length;
    const rmr = estado === "PERNAMBUCO" && MUNICIPIOS_RMR.has(municipio);

    let grupo: string | undefined;
    if (rmr && produto === "GASOLINA COMUM") grupo = `rmr_gasolina_comum_cnpj${digitos}`;
    else if (rmr && produto === "GASOLINA ADITIVADA") grupo = "rmr_gasolina_aditivada";
    else if (rmr && produto === "ETANOL") grupo = "rmr_etanol";
    else if (estado === "PERNAMBUCO" && produto === "GASOLINA COMUM") grupo = "pe_fora_da_rmr_gasolina_comum";
    else if (estado !== "PERNAMBUCO" && temArtefato(preco))
      grupo =
        produto === "GASOLINA COMUM"
          ? "outro_estado_gasolina_comum_artefato_float"
          : "outro_estado_outro_produto_artefato_float";
    else if (estado !== "PERNAMBUCO" && produto === "GASOLINA COMUM") grupo = "outro_estado_gasolina_comum";
    else if (estado !== "PERNAMBUCO") grupo = "outro_estado_outro_produto";

    if (grupo && (cotas[grupo] ?? 0) > 0) {
      cotas[grupo] -= 1;
      escolhidas.push({ linha, grupo });
    }
  }
  const faltando = Object.entries(cotas).filter(([, n]) => n > 0);
  if (faltando.length > 0) throw new Error(`Grupos sem linhas suficientes: ${JSON.stringify(faltando)}`);

  // Remonta sheet1.xml e sharedStrings.xml só com as linhas mantidas.
  const novoIndiceSst = new Map<number, number>();
  let referenciasSst = 0;
  const remapear = (c: Celula, numero: number): string => {
    let xml = c.xml.replace(/\br="([A-Z]+)\d+"/, `r="$1${numero}"`);
    if (c.tipo === "s" && c.valor !== undefined) {
      const antigo = Number(c.valor);
      if (!novoIndiceSst.has(antigo)) novoIndiceSst.set(antigo, novoIndiceSst.size);
      xml = xml.replace(/<v>\d+<\/v>/, `<v>${novoIndiceSst.get(antigo)}</v>`);
      referenciasSst++;
    }
    return xml;
  };

  const manifesto: LinhaManifesto[] = [];
  let celulaInline = "";
  const xmlLinhas: string[] = [];
  const montarLinha = (linha: Linha, numero: number, grupo?: string) => {
    const atributos = linha.atributos.replace(/\br="\d+"/, `r="${numero}"`);
    const celulas = linha.celulas.map((c) => {
      // A primeira linha de gasolina comum da RMR leva a FANTASIA como inlineStr (mesmo texto),
      // para o T016 cobrir esse formato. O arquivo original só usa sharedStrings.
      if (grupo?.startsWith("rmr_gasolina_comum") && !celulaInline && c.coluna === col.fantasia && c.tipo === "s") {
        celulaInline = `${c.coluna}${numero}`;
        const estilo = /\bs="(\d+)"/.exec(c.atributos)?.[1];
        return `<c r="${celulaInline}"${estilo ? ` s="${estilo}"` : ""} t="inlineStr"><is><t>${escaparXml(texto(c))}</t></is></c>`;
      }
      return remapear(c, numero);
    });
    xmlLinhas.push(`<row${atributos}>${celulas.join("")}</row>`);
    if (grupo) {
      manifesto.push({
        posicao: xmlLinhas.length,
        r: numero,
        grupo,
        cnpjBruto: texto(celula(linha, col.cnpj)),
        digitosCnpj: texto(celula(linha, col.cnpj)).replace(/\D/g, "").length,
        estado: texto(celula(linha, col.estado)),
        municipio: texto(celula(linha, col.municipio)),
        produto: texto(celula(linha, col.produto)),
        precoBruto: celula(linha, col.preco)?.valor ?? "",
      });
    }
  };

  // Metadados e cabeçalho mantêm a numeração original. O arquivo pula as linhas 4 e 9: o PERÍODO
  // fica na 5ª <row> (r="6") e o cabeçalho na 8ª (r="10").
  for (const linha of linhas.slice(0, indiceCabecalho + 1)) montarLinha(linha, linha.numero);
  let proxima = cabecalho.numero + 1;
  for (const { linha, grupo } of escolhidas) montarLinha(linha, proxima++, grupo);
  const ultima = proxima - 1;

  const inicioDados = planilha.indexOf("<sheetData>");
  const fimDados = planilha.indexOf("</sheetData>");
  const novaPlanilha =
    planilha.slice(0, inicioDados).replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="A1:O${ultima}"/>`) +
    `<sheetData>${xmlLinhas.join("")}</sheetData>` +
    planilha.slice(fimDados + "</sheetData>".length);

  const siMantidos = [...novoIndiceSst.entries()].sort((a, b) => a[1] - b[1]).map(([antigo]) => blocosSi[antigo]);
  const aberturaSst = /<sst\b[^>]*>/.exec(sstXml)?.[0] ?? "<sst>";
  const novaAbertura = aberturaSst
    .replace(/\bcount="\d+"/, `count="${referenciasSst}"`)
    .replace(/\buniqueCount="\d+"/, `uniqueCount="${siMantidos.length}"`);
  const novoSst = sstXml.slice(0, sstXml.indexOf(aberturaSst)) + novaAbertura + siMantidos.join("") + "</sst>";

  const saida: Zippable = {};
  for (const [nome, conteudo] of Object.entries(arquivos)) saida[nome] = [conteudo, { mtime: MTIME_ZIP }];
  saida["xl/worksheets/sheet1.xml"] = [strToU8(novaPlanilha), { mtime: MTIME_ZIP }];
  saida["xl/sharedStrings.xml"] = [strToU8(novoSst), { mtime: MTIME_ZIP }];
  return { xlsx: zipSync(saida, { level: 9 }), periodo, linhas: manifesto, celulaInline };
}

function conferirXlsx(bytes: Uint8Array, periodo: string): void {
  const arquivos = unzipSync(bytes);
  const planilha = strFromU8(arquivos["xl/worksheets/sheet1.xml"]);
  const sst = [...strFromU8(arquivos["xl/sharedStrings.xml"]).matchAll(/<si\b[^>]*>[\s\S]*?<\/si>/g)].map((m) =>
    [...m[0].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((t) => decodificarXml(t[1])).join(""),
  );
  // Conta pela posição do <row>, como o lerPlanilha (T016): o arquivo pula as linhas 4 e 9, então
  // a 5ª <row> é a r="6" (PERÍODO) e a 8ª é a r="10" (cabeçalho).
  const linhas = [...planilha.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map((m) => m[1]);
  const textoA = (posicao: number) => {
    const c = lerCelulas(linhas[posicao - 1] ?? "").find((x) => x.coluna === "A");
    return c?.tipo === "s" ? sst[Number(c.valor)] : (c?.valor ?? "");
  };
  if (textoA(5) !== periodo) throw new Error(`Conferência: a 5ª linha deveria ter "${periodo}".`);
  if (textoA(8) !== "CNPJ") throw new Error('Conferência: a 8ª linha deveria ter A = "CNPJ".');
}

async function main(): Promise<void> {
  const raiz = resolve(process.cwd());
  if (!existsSync(join(raiz, "supabase", "config.toml"))) {
    throw new Error("Rode na raiz do repositório: npx tsx scripts/fixtures/recortar-fontes-anp.ts");
  }
  const destino = join(raiz, "supabase", "functions", "_shared", "fixtures");

  // Monta tudo antes de gravar: se uma fonte falhar, nenhuma fixture fica pela metade.
  const { envelope, escolhas } = await recortarRevendedores();
  const pagina = await recortarPagina();
  const recorte = recortarXlsx(await baixar(pagina.urlSemana));
  conferirXlsx(recorte.xlsx, recorte.periodo);

  mkdirSync(destino, { recursive: true });
  writeFileSync(join(destino, "revendedores-pe-amostra.json"), `${JSON.stringify(envelope, null, 2)}\n`);
  console.log(`revendedores-pe-amostra.json: ${escolhas.length} registros`);
  writeFileSync(join(destino, "lpc-pagina-amostra.html"), pagina.html);
  console.log(`lpc-pagina-amostra.html: ${pagina.links.length} links revendas (mais 1 duplicado)`);
  writeFileSync(join(destino, "lpc-amostra.xlsx"), recorte.xlsx);
  console.log(`lpc-amostra.xlsx: ${recorte.linhas.length} linhas de dados, ${recorte.xlsx.length} bytes`);

  const manifesto = {
    geradoEm: new Date().toISOString().slice(0, 10),
    geradoPor: "scripts/fixtures/recortar-fontes-anp.ts",
    fontes: { api: URL_API, paginaLpc: URL_PAGINA_LPC, arquivoSemana: pagina.urlSemana },
    revendedores: escolhas,
    paginaLpc: { linksRevendas: pagina.links, linkDuplicado: pagina.duplicado },
    lpc: {
      periodo: recorte.periodo,
      posicaoPeriodo: { posicao: 5, r: 6 },
      posicaoCabecalho: { posicao: 8, r: 10 },
      celulaInlineStr: recorte.celulaInline,
      linhas: recorte.linhas,
    },
    observacoes: [
      "Nenhuma linha de gasolina comum da RMR nesta semana tem preço com artefato de float. As linhas dos grupos *_artefato_float trazem preços reais com artefato, para o T013. O caso do T017 deve copiar uma linha da RMR em memória e trocar só o preço por um desses valores.",
      `A célula ${recorte.celulaInline} foi gravada como inlineStr, com o mesmo texto, para o T016 cobrir esse formato. O arquivo original só usa sharedStrings.`,
      "Nenhum registro da RMR na API tem distribuidora vazia (a bandeira branca vem como \"BANDEIRA BRANCA\"). O caso de distribuidora vazia do T018 deve alterar uma cópia do registro em memória.",
      "Nenhum registro da RMR na API tem coordenada fora da RMR. O caso do T018 deve alterar uma cópia do registro em memória.",
      "O arquivo semanal não tem linhas repetidas de posto e data. Os casos de conflito do T017 devem ser montados em memória.",
    ],
  };
  writeFileSync(join(destino, "manifesto.json"), `${JSON.stringify(manifesto, null, 2)}\n`);
  console.log("manifesto.json: gravado");
}

main().catch((erro: unknown) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exitCode = 1;
});
