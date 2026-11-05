import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { FormatoInesperadoError, parseEnvelopeRevendedores, parseRevendedor } from "./revendedores.ts";

type Registro = Record<string, unknown> & { cnpj: string; municipio: string };

const envelope = JSON.parse(
  readFileSync(fileURLToPath(new URL("./fixtures/revendedores-pe-amostra.json", import.meta.url)), "utf8"),
) as { data: Registro[] } & Record<string, unknown>;
const registro = (cnpj: string) => {
  const r = envelope.data.find((x) => x.cnpj === cnpj);
  if (!r) throw new Error(`fixture sem o CNPJ ${cnpj}`);
  return { ...r };
};
const valido = (r: unknown) => {
  const resultado = parseRevendedor(r);
  if (resultado.tipo !== "valido") throw new Error(`esperava válido, veio ${JSON.stringify(resultado)}`);
  return resultado.posto;
};

describe("parseEnvelopeRevendedores", () => {
  test("lê os registros e a paginação do envelope real", () => {
    const r = parseEnvelopeRevendedores(envelope);
    expect(r.registros).toHaveLength(12);
    expect(r.totalPagina).toBe(1);
    expect(r.totalRegistro).toBe(12);
  });

  test("envelope sem succeeded, com succeeded falso ou sem paginação lança FormatoInesperadoError", () => {
    const semSucceeded: Record<string, unknown> = { ...envelope };
    delete semSucceeded.succeeded;
    expect(() => parseEnvelopeRevendedores(semSucceeded)).toThrow(FormatoInesperadoError);
    expect(() => parseEnvelopeRevendedores({ ...envelope, succeeded: false })).toThrow(FormatoInesperadoError);
    expect(() => parseEnvelopeRevendedores({ ...envelope, searchPageFilter: undefined })).toThrow(
      FormatoInesperadoError,
    );
    expect(() => parseEnvelopeRevendedores("não é json")).toThrow(FormatoInesperadoError);
  });

  test("página além da última (sem data) devolve lista vazia com o totalPagina", () => {
    const r = parseEnvelopeRevendedores({
      status: 200,
      title: "Nenhum dado encontrado",
      succeeded: true,
      searchPageFilter: { numeroPagina: 2, tamanhoPagina: 5000, totalRegistro: 1634, totalPagina: 1 },
    });
    expect(r).toEqual({ registros: [], totalPagina: 1, totalRegistro: 1634 });
  });
});

describe("parseRevendedor com os registros reais", () => {
  test("registros fora da RMR são ignorados", () => {
    const resultados = envelope.data.map((r) => ({ municipio: r.municipio, tipo: parseRevendedor(r).tipo }));
    expect(resultados.filter((r) => r.tipo === "ignorado").map((r) => r.municipio).sort()).toEqual([
      "CARUARU",
      "PETROLINA",
    ]);
    expect(resultados.filter((r) => r.tipo === "valido")).toHaveLength(10);
  });

  test("o posto sem coordenada fica com localizacao null e localizacaoInvalida", () => {
    const posto = valido(registro("05648920000134"));
    expect(posto.localizacao).toBeNull();
    expect(posto.localizacaoInvalida).toBe(true);
  });

  test("um posto com coordenada válida traz lat e lng em número", () => {
    const posto = valido(registro("00338804000103"));
    expect(posto).toMatchObject({
      cnpj: "00338804000103",
      razaoSocial: "POSTO ENSEADA DO NORTE LTDA",
      municipio: "OLINDA",
      uf: "PE",
      bandeira: "VIBRA",
      localizacao: { lat: -7.9849641, lng: -34.8381451 },
      localizacaoInvalida: false,
      acuraciaEstimada: "5",
      origemLocalizacao: "Agente de fiscalização da ANP",
    });
  });

  test("endereço sem complemento fica sem espaços duplicados", () => {
    expect(valido(registro("00338804000103")).endereco).toBe("AVENIDA GOV CARLOS DE LIMA CAVALCANTI, 2314");
  });

  test("endereço e complemento são unidos, sem espaços duplicados (complemento real: \"0\")", () => {
    expect(valido(registro("00304243000113")).endereco).toBe("AVENIDA NORTE, 4390, 0");
  });

  test("bandeira branca vem escrita como na fonte", () => {
    expect(valido(registro("01214408000129")).bandeira).toBe("BANDEIRA BRANCA");
  });
});

describe("parseRevendedor com registros alterados em memória", () => {
  test("coordenada fora da RMR vira localizacao null", () => {
    const posto = valido({ ...registro("00338804000103"), latitude: "-9.4", longitude: "-40.5" });
    expect(posto.localizacao).toBeNull();
    expect(posto.localizacaoInvalida).toBe(true);
  });

  test("coordenada que não é número vira localizacao null", () => {
    expect(valido({ ...registro("00338804000103"), latitude: "abc" }).localizacao).toBeNull();
  });

  test("distribuidora vazia vira bandeira null", () => {
    expect(valido({ ...registro("00338804000103"), distribuidora: "  " }).bandeira).toBeNull();
  });

  test("CEP fica só com dígitos, com 8 dígitos ou null", () => {
    expect(valido({ ...registro("00338804000103"), cep: "53030-260" }).cep).toBe("53030260");
    expect(valido({ ...registro("00338804000103"), cep: "530302" }).cep).toBeNull();
    expect(valido({ ...registro("00338804000103"), cep: "" }).cep).toBeNull();
  });

  test("CNPJ inválido é rejeitado com o motivo", () => {
    expect(parseRevendedor({ ...registro("00338804000103"), cnpj: "00338804000104" })).toEqual({
      tipo: "rejeitado",
      motivo: "cnpj_invalido",
    });
  });

  test("razão social vazia ou campo com tipo errado é rejeitado", () => {
    expect(parseRevendedor({ ...registro("00338804000103"), razaoSocial: " " }).tipo).toBe("rejeitado");
    expect(parseRevendedor({ ...registro("00338804000103"), municipio: 42 }).tipo).toBe("rejeitado");
    expect(parseRevendedor(null).tipo).toBe("rejeitado");
  });
});
