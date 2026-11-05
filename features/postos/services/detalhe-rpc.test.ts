import { describe, expect, it } from "vitest";
import { lerDetalheRpc } from "./detalhe-rpc";

const FONTE = "ANP – Levantamento de Preços de Combustíveis";

// O formato do contrato (contracts/supabase-rpc.md).
const json = {
  cnpj: "11694577000167",
  nome: "IGUEP INCORPORADORA GUEDES PEREIRA LTDA",
  bandeira: "VIBRA",
  endereco: "AVENIDA ENG ABDIAS DE CARVALHO, 1142",
  bairro: "PRADO",
  municipio: "RECIFE",
  lat: -8.06246,
  lng: -34.91138,
  ativo: true,
  coletas: [
    { data: "2026-10-20", preco: 6.59, fonte: FONTE },
    { data: "2026-10-13", preco: 6.49, fonte: FONTE },
  ],
};

describe("lerDetalheRpc", () => {
  it("converte o JSON do RPC, com o preço em milésimos inteiros", () => {
    expect(lerDetalheRpc(json)).toEqual({
      ...json,
      coletas: [
        { data: "2026-10-20", precoMilesimos: 6590, fonte: FONTE },
        { data: "2026-10-13", precoMilesimos: 6490, fonte: FONTE },
      ],
    });
  });

  it("null (CNPJ inexistente ou fora do formato) → null", () => {
    expect(lerDetalheRpc(null)).toBeNull();
  });

  it("coletas nulas (json_agg de nada) viram lista vazia", () => {
    expect(lerDetalheRpc({ ...json, coletas: null })?.coletas).toEqual([]);
  });

  it("garante a ordem da mais recente para a mais antiga", () => {
    const fora = { ...json, coletas: [...json.coletas].reverse() };
    expect(lerDetalheRpc(fora)?.coletas.map((c) => c.data)).toEqual(["2026-10-20", "2026-10-13"]);
  });

  it("aceita o numeric como texto e arredonda o artefato de ponto flutuante", () => {
    const vm = lerDetalheRpc({ ...json, coletas: [{ data: "2026-10-20", preco: "6.599", fonte: FONTE }] });
    expect(vm?.coletas[0].precoMilesimos).toBe(6599);
  });

  it("formato inesperado → erro, em vez de mostrar dado errado", () => {
    expect(() => lerDetalheRpc({ ...json, cnpj: 123 })).toThrow();
    expect(() => lerDetalheRpc({ ...json, coletas: [{ data: "20/10/2026", preco: 6.59, fonte: FONTE }] })).toThrow();
  });
});
