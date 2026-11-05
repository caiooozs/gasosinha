/**
 * Leitor enxuto do XLSX semanal do LPC (T026), sem SheetJS (R6).
 *
 * Descompacta com fflate e extrai `<row>`, `<c>`, `<v>` e `<t>` por expressões regulares sobre
 * xl/worksheets/sheet1.xml e xl/sharedStrings.xml.
 *
 * Medição em 2026-11-04, com o arquivo semanal real (revendas_lpc_2026_10_18-2026_10_24.xlsx:
 * 1,9 MB compactado, 12,9 MB de XML, 20.934 linhas), em Node 24 no Windows:
 * - tempo da thread principal (relógio): cerca de 150 ms quente e 190 ms na primeira execução;
 * - CPU do processo inteiro, que soma as threads paralelas de coleta de lixo: de 140 a 340 ms;
 * - por etapa: descompactar 40 ms, varrer o XML 36 ms, montar as linhas o resto.
 * A meta do T026 era ficar abaixo de 300 ms; o limite da Edge Function é de 2 s de CPU.
 */
import { strFromU8, unzipSync } from "fflate";
import { FormatoInesperadoError } from "./erros.ts";

/** Uma linha da planilha, indexada pela letra da coluna. Célula ausente ou vazia vira `null`. */
export type LinhaPlanilha = Record<string, string | null>;

const PLANILHA = "xl/worksheets/sheet1.xml";
const COMPARTILHADAS = "xl/sharedStrings.xml";

const ENTIDADES: Record<string, string> = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };

/** Decodifica as entidades XML numa única passada (sem decodificar duas vezes). */
export function decodificarXml(texto: string): string {
  if (!texto.includes("&")) return texto;
  return texto.replace(/&(#x[0-9a-fA-F]+|#\d+|lt|gt|amp|quot|apos);/g, (_, entidade: string) => {
    if (entidade[0] !== "#") return ENTIDADES[entidade];
    const codigo = entidade[1] === "x" || entidade[1] === "X" ? parseInt(entidade.slice(2), 16) : Number(entidade.slice(1));
    return String.fromCodePoint(codigo);
  });
}

/** Junta o texto dos `<t>` de um `<si>` ou `<is>`, ignorando as anotações fonéticas `<rPh>`. */
function textoDeRuns(xml: string): string {
  const semFonetica = xml.includes("<rPh") ? xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "") : xml;
  let texto = "";
  const regex = /<t\b[^>]*?(?:\/>|>([\s\S]*?)<\/t>)/g;
  for (let m = regex.exec(semFonetica); m; m = regex.exec(semFonetica)) texto += m[1] ?? "";
  return decodificarXml(texto);
}

function lerCompartilhadas(xml: string): string[] {
  const textos: string[] = [];
  const regex = /<si\b[^>]*?(?:\/>|>([\s\S]*?)<\/si>)/g;
  for (let m = regex.exec(xml); m; m = regex.exec(xml)) textos.push(m[1] ? textoDeRuns(m[1]) : "");
  return textos;
}

/** O valor de um atributo em ` r="A1" s="2" t="s"`, sem regex (é chamado para cada célula). */
function atributo(atributos: string, nome: string): string | undefined {
  const marca = ` ${nome}="`;
  const inicio = atributos.indexOf(marca);
  if (inicio < 0) return undefined;
  const valor = inicio + marca.length;
  return atributos.slice(valor, atributos.indexOf('"', valor));
}

/** Índice (0-based) da coluna a partir da referência da célula, ex.: "AB12" → 27. */
function indiceDaColuna(referencia: string): number {
  let indice = 0;
  for (let i = 0; i < referencia.length; i++) {
    const codigo = referencia.charCodeAt(i);
    if (codigo < 65 || codigo > 90) break;
    indice = indice * 26 + (codigo - 64);
  }
  return indice - 1;
}

function letrasDaColuna(indice: number): string {
  let letras = "";
  for (let n = indice + 1; n > 0; n = Math.floor((n - 1) / 26)) letras = String.fromCharCode(65 + ((n - 1) % 26)) + letras;
  return letras;
}

/** Lê a primeira planilha do XLSX: uma entrada por `<row>`, na ordem do arquivo. */
export function lerPlanilha(bytes: Uint8Array): LinhaPlanilha[] {
  let arquivos: Record<string, Uint8Array>;
  try {
    arquivos = unzipSync(bytes, { filter: (f) => f.name === PLANILHA || f.name === COMPARTILHADAS });
  } catch {
    throw new FormatoInesperadoError("xlsx_invalido", "o arquivo não é um ZIP válido");
  }
  const planilha = arquivos[PLANILHA];
  if (!planilha) throw new FormatoInesperadoError("xlsx_invalido", `o arquivo não tem ${PLANILHA}`);
  const compartilhadas = arquivos[COMPARTILHADAS] ? lerCompartilhadas(strFromU8(arquivos[COMPARTILHADAS])) : [];
  const xml = strFromU8(planilha);

  // Uma única varredura: abertura e fechamento de <row> e cada <c>, autofechada ou não.
  const regex = /<row\b[^>]*\/>|<row\b[^>]*>|<\/row>|<c\b([^>]*?)\/>|<c\b([^>]*?)>([\s\S]*?)<\/c>/g;
  // Cada linha é montada como array (índice da coluna → valor) e só no fim vira objeto, sempre com
  // as chaves na mesma ordem: assim o V8 mantém um único formato de objeto para as 20 mil linhas.
  const linhas: (string | undefined)[][] = [];
  let atual: (string | undefined)[] | null = null;
  let anterior = -1;
  let maiorColuna = -1;

  for (let m = regex.exec(xml); m; m = regex.exec(xml)) {
    const token = m[0];
    if (token.startsWith("<row")) {
      atual = [];
      linhas.push(atual);
      anterior = -1;
      if (token.endsWith("/>")) atual = null;
      continue;
    }
    if (token === "</row>") {
      atual = null;
      continue;
    }
    if (!atual) continue;

    const atributos = m[1] ?? m[2] ?? "";
    const referencia = atributo(atributos, "r");
    const coluna = referencia ? indiceDaColuna(referencia) : anterior + 1;
    anterior = coluna;
    if (coluna > maiorColuna) maiorColuna = coluna;

    const interno = m[3];
    if (interno === undefined) continue; // célula autofechada: vazia
    const tipo = atributo(atributos, "t");
    let valor: string | undefined;
    if (tipo === "inlineStr") {
      const inicio = interno.indexOf("<is>");
      const fim = interno.indexOf("</is>");
      if (inicio >= 0 && fim > inicio) valor = textoDeRuns(interno.slice(inicio + 4, fim));
    } else {
      const inicio = interno.indexOf("<v>");
      const fim = interno.indexOf("</v>");
      if (inicio >= 0 && fim > inicio) {
        const bruto = interno.slice(inicio + 3, fim);
        valor = tipo === "s" ? compartilhadas[Number(bruto)] : decodificarXml(bruto);
      }
    }
    if (valor !== undefined && valor !== "") atual[coluna] = valor;
  }

  // Célula ausente vira null, de A até a última coluna usada na planilha.
  const letras = Array.from({ length: maiorColuna + 1 }, (_, i) => letrasDaColuna(i));
  return linhas.map((valores) => {
    const linha: LinhaPlanilha = {};
    for (let i = 0; i < letras.length; i++) linha[letras[i]] = valores[i] ?? null;
    return linha;
  });
}
