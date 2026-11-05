import { describe, expect, test } from "vitest";
import { planejarSincronizacaoPostos, type PostoGravado } from "./retrato-postos.ts";
import type { PostoNormalizado } from "./revendedores.ts";

const recebido = (cnpj: string, extra: Partial<PostoNormalizado> = {}): PostoNormalizado => ({
  cnpj,
  razaoSocial: `POSTO ${cnpj}`,
  bandeira: "VIBRA",
  endereco: "AVENIDA NORTE, 4390",
  bairro: "TAMARINEIRA",
  cep: "52051000",
  municipio: "RECIFE",
  uf: "PE",
  localizacao: { lat: -8.06246, lng: -34.91138 },
  localizacaoInvalida: false,
  acuraciaEstimada: "4",
  origemLocalizacao: "Agente de fiscalização da ANP",
  ...extra,
});

const gravado = (cnpj: string, ativo = true, extra: Partial<PostoNormalizado> = {}): PostoGravado => {
  const { localizacaoInvalida, ...dados } = recebido(cnpj, extra);
  void localizacaoInvalida; // não é gravada
  return { ...dados, ativo };
};

const cnpjs = (n: number, inicio = 0) => Array.from({ length: n }, (_, i) => String(inicio + i).padStart(14, "0"));

describe("planejarSincronizacaoPostos", () => {
  test("posto novo vai para inserir", () => {
    const plano = planejarSincronizacaoPostos([gravado("1")], [recebido("1"), recebido("2")]);
    expect(plano.inserir.map((p) => p.cnpj)).toEqual(["2"]);
  });

  test("posto igual vai para inalterados, mesmo com a coordenada escrita de outro jeito", () => {
    const g = gravado("1", true, { localizacao: { lat: -8.06246, lng: -34.91138 } });
    const r = recebido("1", { localizacao: { lat: -8.0624600, lng: -34.911380000001 } });
    const plano = planejarSincronizacaoPostos([g], [r]);
    expect(plano.inalterados).toEqual(["1"]);
    expect(plano.atualizar).toEqual([]);
  });

  test("endereço, bandeira ou coordenada diferente vai para atualizar", () => {
    const plano = planejarSincronizacaoPostos(
      [gravado("1"), gravado("2"), gravado("3")],
      [
        recebido("1", { endereco: "RUA NOVA, 10" }),
        recebido("2", { bandeira: null }),
        recebido("3", { localizacao: { lat: -8.0625, lng: -34.91138 } }),
      ],
    );
    expect(plano.atualizar.map((p) => p.cnpj)).toEqual(["1", "2", "3"]);
  });

  test("posto ativo ausente do retrato vai para desativar", () => {
    const todos = cnpjs(10);
    const plano = planejarSincronizacaoPostos(
      todos.map((c) => gravado(c)),
      todos.slice(0, 9).map((c) => recebido(c)),
    );
    expect(plano.valido).toBe(true);
    expect(plano.desativar).toEqual([todos[9]]);
  });

  test("posto inativo que voltou vai para reativar, com os dados recebidos", () => {
    const plano = planejarSincronizacaoPostos(
      [gravado("1"), gravado("2", false)],
      [recebido("1"), recebido("2", { endereco: "RUA NOVA, 10" })],
    );
    expect(plano.reativar).toEqual([recebido("2", { endereco: "RUA NOVA, 10" })]);
    expect(plano.atualizar).toEqual([]);
    expect(plano.desativar).toEqual([]);
  });

  test("retrato com menos de 80% dos ativos é inválido, e todas as listas ficam vazias", () => {
    const todos = cnpjs(10);
    const plano = planejarSincronizacaoPostos(
      todos.map((c) => gravado(c)),
      todos.slice(0, 7).map((c) => recebido(c)),
    );
    expect(plano).toEqual({ valido: false, inserir: [], atualizar: [], inalterados: [], desativar: [], reativar: [] });
  });

  test("70% dos ativos mais postos novos não chega aos 80%, porque os novos não contam", () => {
    const todos = cnpjs(10);
    const recebidos = [...todos.slice(0, 7), ...cnpjs(5, 100)].map((c) => recebido(c));
    expect(planejarSincronizacaoPostos(todos.map((c) => gravado(c)), recebidos).valido).toBe(false);
  });

  test("exatamente 80% dos ativos é válido", () => {
    const todos = cnpjs(10);
    const plano = planejarSincronizacaoPostos(
      todos.map((c) => gravado(c)),
      todos.slice(0, 8).map((c) => recebido(c)),
    );
    expect(plano.valido).toBe(true);
    expect(plano.desativar).toEqual(todos.slice(8));
  });

  test("postos inativos não entram na conta dos 80%", () => {
    const ativos = cnpjs(5);
    const inativos = cnpjs(20, 100).map((c) => gravado(c, false));
    const plano = planejarSincronizacaoPostos(
      [...ativos.map((c) => gravado(c)), ...inativos],
      ativos.slice(0, 4).map((c) => recebido(c)),
    );
    expect(plano.valido).toBe(true);
  });

  test("banco vazio (primeira carga) é válido, com tudo em inserir", () => {
    const plano = planejarSincronizacaoPostos([], [recebido("1"), recebido("2")]);
    expect(plano.valido).toBe(true);
    expect(plano.inserir.map((p) => p.cnpj)).toEqual(["1", "2"]);
  });
});
