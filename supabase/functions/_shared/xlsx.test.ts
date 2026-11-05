import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { describe, expect, test } from "vitest";
import { FormatoInesperadoError } from "./erros.ts";
import { lerPlanilha } from "./xlsx.ts";

const fixture = (nome: string) => readFileSync(fileURLToPath(new URL(`./fixtures/${nome}`, import.meta.url)));
const bytes = new Uint8Array(fixture("lpc-amostra.xlsx"));
const manifesto = JSON.parse(fixture("manifesto.json").toString("utf8")) as {
  lpc: { celulaInlineStr: string; linhas: { posicao: number; r: number; cnpjBruto: string; precoBruto: string }[] };
};

function xlsxMinimo(planilha: string, compartilhadas?: string): Uint8Array {
  const arquivos: Record<string, Uint8Array> = { "xl/worksheets/sheet1.xml": strToU8(planilha) };
  if (compartilhadas) arquivos["xl/sharedStrings.xml"] = strToU8(compartilhadas);
  return zipSync(arquivos);
}

describe("lerPlanilha com o recorte real do LPC", () => {
  const linhas = lerPlanilha(bytes);

  test("devolve uma linha por <row>: 7 de metadados, o cabeçalho e 40 de dados", () => {
    expect(linhas).toHaveLength(48);
  });

  test("o 5º item é o PERÍODO (a <row r=\"6\">) e o 8º é o cabeçalho (a <row r=\"10\">)", () => {
    expect(linhas[4].A).toBe("PERÍODO: 18/10/2026 A 24/10/2026");
    expect(linhas[7].A).toBe("CNPJ");
  });

  test("indexa pela letra da coluna e resolve sharedStrings", () => {
    expect(linhas[7].L).toBe("PRODUTO");
    expect(linhas[7].N).toBe("PREÇO DE REVENDA");
    expect(linhas[7].O).toBe("DATA DA COLETA");
  });

  test("lê a célula inlineStr com o mesmo texto que está no XML", () => {
    const celula = manifesto.lpc.celulaInlineStr; // ex.: C24
    const xml = strFromU8(unzipSync(bytes)["xl/worksheets/sheet1.xml"]);
    const esperado = new RegExp(`<c r="${celula}"[^>]*t="inlineStr"[^>]*><is><t>([^<]*)</t></is></c>`).exec(xml)?.[1];
    expect(esperado).toBeTruthy();
    const linha = manifesto.lpc.linhas.find((l) => l.r === Number(celula.slice(1)));
    expect(linhas[(linha?.posicao ?? 0) - 1].C).toBe(esperado);
  });

  test("célula ausente vira null", () => {
    expect(linhas[0].A).toContain("AGÊNCIA NACIONAL DO PETRÓLEO");
    expect(linhas[0].B).toBeNull();
    expect(linhas[0].O).toBeNull();
  });

  test("números ficam como o texto bruto do XML", () => {
    const linha = manifesto.lpc.linhas[0];
    expect(linhas[linha.posicao - 1].A).toBe(linha.cnpjBruto);
    expect(linhas[linha.posicao - 1].N).toBe(linha.precoBruto);
  });
});

describe("lerPlanilha com arquivos montados no teste", () => {
  test("decodifica entidades XML em sharedStrings e em inlineStr", () => {
    const planilha =
      '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c>' +
      '<c r="B1" t="inlineStr"><is><t>A &lt; B &amp; C</t></is></c></row></sheetData></worksheet>';
    const compartilhadas = '<sst count="1" uniqueCount="1"><si><t>POSTO &amp; CIA &#225;</t></si></sst>';
    expect(lerPlanilha(xlsxMinimo(planilha, compartilhadas))).toEqual([{ A: "POSTO & CIA á", B: "A < B & C" }]);
  });

  test("funciona sem sharedStrings e com célula vazia autofechada", () => {
    const planilha =
      '<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>x</t></is></c><c r="C1" s="2"/></row>' +
      '<row r="3"><c r="B3"><v>7.19</v></c></row></sheetData></worksheet>';
    expect(lerPlanilha(xlsxMinimo(planilha))).toEqual([
      { A: "x", B: null, C: null },
      { A: null, B: "7.19", C: null },
    ]);
  });

  test("um arquivo sem a planilha lança FormatoInesperadoError", () => {
    expect(() => lerPlanilha(zipSync({ "outro.xml": strToU8("<x/>") }))).toThrow(FormatoInesperadoError);
  });

  test("bytes que não são ZIP lançam FormatoInesperadoError", () => {
    expect(() => lerPlanilha(strToU8("não é um xlsx"))).toThrow(FormatoInesperadoError);
  });
});
