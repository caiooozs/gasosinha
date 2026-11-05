import { describe, expect, it } from "vitest";
import { dataAtualizacaoPrecos } from "./atualizacao";
import type { EstadoFonteLido } from "./avaliar-status";

const base = { em_problema: false, tipo_problema: null, problema_desde: null, ultima_edicao_fim: null };

describe("dataAtualizacaoPrecos", () => {
  it("é a data (fuso de São Paulo) da última sincronização bem-sucedida dos preços", () => {
    const estados: EstadoFonteLido[] = [
      { ...base, fonte: "cadastro", ultima_ok_em: "2026-11-03T12:00:00+00:00" },
      { ...base, fonte: "precos", ultima_ok_em: "2026-11-05T02:30:00+00:00" },
    ];
    // 02:30 UTC de 05/11 ainda é 04/11 em São Paulo.
    expect(dataAtualizacaoPrecos(estados)).toBe("2026-11-04");
  });

  it("sem linha de preços ou sem sincronização bem-sucedida → null", () => {
    expect(dataAtualizacaoPrecos([])).toBeNull();
    expect(dataAtualizacaoPrecos([{ ...base, fonte: "precos", ultima_ok_em: null }])).toBeNull();
  });
});
