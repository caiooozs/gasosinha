import { describe, expect, test } from "vitest";
import { classificarLote, decidirEdicao } from "./lote-precos.ts";
import type { LinhaLpcValida } from "./schemas.ts";

const linha = (n: number, cnpj: string, dataColeta: string, precoMilesimos: number): LinhaLpcValida => ({
  linha: n,
  cnpj,
  dataColeta,
  precoMilesimos,
  preco: `${Math.floor(precoMilesimos / 1000)}.${String(precoMilesimos % 1000).padStart(3, "0")}`,
  municipio: "RECIFE",
});

const A = "11694577000167";
const B = "08220930000162";
const DESCONHECIDO = "00672715000352";
const cadastrados = new Set([A, B]);

describe("classificarLote", () => {
  test("chave nova com CNPJ cadastrado entra em novas", () => {
    const r = classificarLote([linha(9, A, "2026-10-20", 6590)], [], cadastrados);
    expect(r).toEqual({ novas: [linha(9, A, "2026-10-20", 6590)], jaExistentes: 0, conflitos: [], semPosto: 0 });
  });

  test("mesma chave e mesmo preço já gravados: conta em jaExistentes e fica fora de novas", () => {
    const r = classificarLote(
      [linha(9, A, "2026-10-20", 6590)],
      [{ cnpj: A, dataColeta: "2026-10-20", precoMilesimos: 6590 }],
      cadastrados,
    );
    expect(r.novas).toEqual([]);
    expect(r.jaExistentes).toBe(1);
    expect(r.conflitos).toEqual([]);
  });

  test("mesma chave com preço diferente: conflito_com_existente, e o gravado é mantido", () => {
    const r = classificarLote(
      [linha(9, A, "2026-10-20", 6590)],
      [{ cnpj: A, dataColeta: "2026-10-20", precoMilesimos: 6490 }],
      cadastrados,
    );
    expect(r.novas).toEqual([]);
    expect(r.conflitos).toEqual([{ linha: 9, motivo: "conflito_com_existente" }]);
  });

  test("CNPJ ausente de postos entra em novas (fica guardado, FR-024) e conta em semPosto", () => {
    const r = classificarLote([linha(9, DESCONHECIDO, "2026-10-20", 6970)], [], cadastrados);
    expect(r.novas).toHaveLength(1);
    expect(r.semPosto).toBe(1);
  });

  test("o preço é comparado em milésimos inteiros", () => {
    const r = classificarLote(
      [linha(9, B, "2026-10-21", 6590)],
      [{ cnpj: B, dataColeta: "2026-10-21", precoMilesimos: 6590 }],
      cadastrados,
    );
    expect(r.jaExistentes).toBe(1);
    expect(r.conflitos).toEqual([]);
  });

  test("datas diferentes do mesmo posto são chaves diferentes", () => {
    const r = classificarLote(
      [linha(9, A, "2026-10-21", 6590)],
      [{ cnpj: A, dataColeta: "2026-10-20", precoMilesimos: 6490 }],
      cadastrados,
    );
    expect(r.novas).toHaveLength(1);
  });
});

describe("decidirEdicao", () => {
  const periodo = { inicio: "2026-10-18", fim: "2026-10-24" };
  const janelaDesde = "2025-11-04";

  test("edição concluída ou fora da janela já foi processada", () => {
    expect(decidirEdicao({ existente: { status: "concluida" }, periodo, janelaDesde })).toBe("ja_processada");
    expect(decidirEdicao({ existente: { status: "fora_da_janela" }, periodo, janelaDesde })).toBe("ja_processada");
  });

  test("período que termina antes do início da janela fica fora da janela", () => {
    const antigo = { inicio: "2025-10-19", fim: "2025-10-25" };
    expect(decidirEdicao({ existente: null, periodo: antigo, janelaDesde })).toBe("fora_da_janela");
    expect(decidirEdicao({ existente: { status: "em_andamento" }, periodo: antigo, janelaDesde })).toBe(
      "fora_da_janela",
    );
  });

  test("edição em andamento é retomada", () => {
    expect(decidirEdicao({ existente: { status: "em_andamento" }, periodo, janelaDesde })).toBe("retomar");
  });

  test("sem edição registrada, dentro da janela: nova", () => {
    expect(decidirEdicao({ existente: null, periodo, janelaDesde })).toBe("nova");
  });
});
