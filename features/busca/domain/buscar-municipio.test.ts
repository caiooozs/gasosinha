import { describe, expect, it } from "vitest";
import { buscarMunicipio } from "./buscar-municipio";

const nomes = (texto: string) => buscarMunicipio(texto).map((m) => m.nome);

describe("buscarMunicipio", () => {
  it("'jaboatao' encontra Jaboatão dos Guararapes, sem acento", () => {
    expect(nomes("jaboatao")).toEqual(["Jaboatão dos Guararapes"]);
  });

  it("'SAO lou' encontra São Lourenço da Mata, sem diferenciar maiúsculas", () => {
    expect(nomes("SAO lou")).toEqual(["São Lourenço da Mata"]);
  });

  it("'cabo' encontra Cabo de Santo Agostinho", () => {
    expect(nomes("cabo")).toEqual(["Cabo de Santo Agostinho"]);
  });

  it("texto vazio ou só espaços → []", () => {
    expect(buscarMunicipio("")).toEqual([]);
    expect(buscarMunicipio("   ")).toEqual([]);
  });

  it("cidade fora da RMR → []", () => {
    expect(buscarMunicipio("caruaru")).toEqual([]);
  });

  it("quem começa com o texto vem antes de quem só o contém", () => {
    // "re" começa "Recife" e aparece no meio de outros nomes (ex.: "Moreno").
    const resultado = nomes("re");
    expect(resultado[0]).toBe("Recife");
    expect(resultado).toContain("Moreno");
  });

  it("devolve os limites do município, para centralizar o mapa", () => {
    const [recife] = buscarMunicipio("recife");
    expect(recife.limites).toHaveLength(4);
  });
});
