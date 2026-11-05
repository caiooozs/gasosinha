import { describe, expect, it } from "vitest";
import { avaliarStatus, type EstadoFonteLido } from "./avaliar-status";

const HOJE = "2026-11-05";
const TEXTO = (data: string) => `Alguns dados podem estar desatualizados. Última atualização bem-sucedida em ${data}.`;

function estados(parcial: { cadastro?: Partial<EstadoFonteLido>; precos?: Partial<EstadoFonteLido> } = {}): EstadoFonteLido[] {
  const base = { em_problema: false, tipo_problema: null, problema_desde: null };
  return [
    {
      ...base,
      fonte: "cadastro",
      ultima_ok_em: "2026-11-03T12:00:00+00:00",
      ultima_edicao_fim: null,
      ...parcial.cadastro,
    },
    {
      ...base,
      fonte: "precos",
      ultima_ok_em: "2026-11-05T12:00:00+00:00",
      ultima_edicao_fim: "2026-10-31",
      ...parcial.precos,
    },
  ];
}

describe("avaliarStatus", () => {
  it("tudo ok → null", () => {
    expect(avaliarStatus(estados(), HOJE)).toBeNull();
  });

  it("em_problema em qualquer fonte → aviso com a última atualização bem-sucedida", () => {
    const aviso = avaliarStatus(
      estados({ cadastro: { em_problema: true, tipo_problema: "falha", ultima_ok_em: "2026-10-30T12:00:00+00:00" } }),
      HOJE,
    );
    expect(aviso).toEqual({ texto: TEXTO("30/10/2026") });
  });

  it("precos.ultima_edicao_fim com mais de 14 dias → aviso, mesmo sem em_problema", () => {
    const aviso = avaliarStatus(estados({ precos: { ultima_edicao_fim: "2026-10-20" } }), HOJE);
    expect(aviso).toEqual({ texto: TEXTO("20/10/2026") });
  });

  it("precos.ultima_edicao_fim com exatamente 14 dias ainda é ok", () => {
    expect(avaliarStatus(estados({ precos: { ultima_edicao_fim: "2026-10-22" } }), HOJE)).toBeNull();
  });

  it("cadastro.ultima_ok_em com mais de 8 dias → aviso", () => {
    const aviso = avaliarStatus(estados({ cadastro: { ultima_ok_em: "2026-10-27T12:00:00+00:00" } }), HOJE);
    expect(aviso).toEqual({ texto: TEXTO("27/10/2026") });
  });

  it("a data do aviso é a mais antiga entre as fontes com problema", () => {
    const aviso = avaliarStatus(
      estados({
        cadastro: { em_problema: true, tipo_problema: "falha", ultima_ok_em: "2026-11-01T12:00:00+00:00" },
        precos: { em_problema: true, tipo_problema: "falha", ultima_ok_em: "2026-10-29T12:00:00+00:00" },
      }),
      HOJE,
    );
    expect(aviso).toEqual({ texto: TEXTO("29/10/2026") });
  });

  it("a data do instante é lida no fuso de São Paulo", () => {
    // 02:30 UTC de 31/10 ainda é 30/10 em São Paulo.
    const aviso = avaliarStatus(
      estados({ cadastro: { em_problema: true, tipo_problema: "falha", ultima_ok_em: "2026-10-31T02:30:00+00:00" } }),
      HOJE,
    );
    expect(aviso).toEqual({ texto: TEXTO("30/10/2026") });
  });

  it("fonte que nunca deu certo → aviso sem data", () => {
    const aviso = avaliarStatus(estados({ cadastro: { ultima_ok_em: null } }), HOJE);
    expect(aviso).toEqual({ texto: "Alguns dados podem estar desatualizados." });
  });

  it("lista vazia (leitura sem linhas) → null", () => {
    expect(avaliarStatus([], HOJE)).toBeNull();
  });
});
