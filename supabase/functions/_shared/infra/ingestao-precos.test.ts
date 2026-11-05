import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { strToU8, zipSync } from "fflate";
import { describe, expect, test } from "vitest";
import { FormatoInesperadoError } from "../erros.ts";
import { parseArquivoLpc } from "../lpc.ts";
import { lerPlanilha } from "../xlsx.ts";
import { criarBancoEmMemoria } from "./banco-em-memoria.ts";
import { FONTE_PRECOS, ingerirArquivoLpc } from "./ingestao-precos.ts";

const bytes = new Uint8Array(readFileSync(fileURLToPath(new URL("../fixtures/lpc-amostra.xlsx", import.meta.url))));
const validas = parseArquivoLpc(lerPlanilha(bytes)).validas;
const URL_SEMANA = "https://www.gov.br/anp/pt-br/x/arquivos-lpc/2026/revendas_lpc_2026_10_18-2026_10_24.xlsx";
const periodo = { inicio: "2026-10-18", fim: "2026-10-24" };
const agora = new Date("2026-11-04T15:00:00Z");
const JANELA = "2025-11-04";

describe("ingerirArquivoLpc", () => {
  test("primeira vez: conclui a edição, grava as coletas da RMR e registra a URL", async () => {
    const { banco, dados } = criarBancoEmMemoria();
    const r = await ingerirArquivoLpc(banco, bytes, URL_SEMANA, JANELA, agora);
    expect(r).toEqual({
      situacao: "concluida",
      periodo,
      contagens: {
        linhas: 40,
        na_regiao: validas.length,
        gravadas: validas.length,
        ja_existentes: 0,
        rejeitadas: 0,
        sem_posto: validas.length,
        motivos: {},
      },
    });
    expect(dados.edicoes).toHaveLength(1);
    expect(dados.edicoes[0]).toMatchObject({ status: "concluida", periodo, url: URL_SEMANA, processadaEm: agora.toISOString() });
    expect(dados.edicoes[0].sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(dados.precos).toHaveLength(validas.length);
    expect(dados.precos.every((p) => p.fonte === FONTE_PRECOS && /^\d+\.\d{3}$/.test(p.preco))).toBe(true);
    expect(dados.links.get(URL_SEMANA)).toEqual({ edicaoId: dados.edicoes[0].id, resultado: "concluida" });
  });

  test("CNPJ cadastrado em postos não conta em sem_posto", async () => {
    const { banco, dados } = criarBancoEmMemoria();
    const conhecido = validas[0];
    await banco.gravarPostos(
      [
        {
          cnpj: conhecido.cnpj,
          razaoSocial: "POSTO",
          bandeira: null,
          endereco: "RUA",
          bairro: null,
          cep: null,
          municipio: conhecido.municipio,
          uf: "PE",
          localizacao: null,
          localizacaoInvalida: true,
          acuraciaEstimada: null,
          origemLocalizacao: null,
        },
      ],
      agora.toISOString(),
    );
    const r = await ingerirArquivoLpc(banco, bytes, URL_SEMANA, JANELA, agora);
    expect(r.situacao === "concluida" && r.contagens.sem_posto).toBe(validas.length - 1);
    expect(dados.precos.some((p) => p.cnpj === conhecido.cnpj)).toBe(true);
  });

  test("a mesma URL de novo é edição já processada e não grava nada (SC-006)", async () => {
    const { banco, dados } = criarBancoEmMemoria();
    await ingerirArquivoLpc(banco, bytes, URL_SEMANA, JANELA, agora);
    const r = await ingerirArquivoLpc(banco, bytes, URL_SEMANA, JANELA, agora);
    expect(r).toEqual({ situacao: "ja_processada", periodo });
    expect(dados.precos).toHaveLength(validas.length);
  });

  test("o mesmo período com outro nome de arquivo é reconhecido, e a URL nova é registrada", async () => {
    const { banco, dados } = criarBancoEmMemoria();
    await ingerirArquivoLpc(banco, bytes, URL_SEMANA, JANELA, agora);
    const outraUrl = URL_SEMANA.replace("revendas_lpc_2026_10_18-2026_10_24", "revendas_lpc-1");
    expect(await ingerirArquivoLpc(banco, bytes, outraUrl, JANELA, agora)).toEqual({ situacao: "ja_processada", periodo });
    expect(dados.links.get(outraUrl)?.resultado).toBe("ja_processada");
  });

  test("retoma uma edição interrompida sem duplicar (FR-022)", async () => {
    const { banco, dados } = criarBancoEmMemoria();
    const edicao = await banco.criarEdicao({ periodo, url: URL_SEMANA, sha256: "a".repeat(64) });
    await banco.gravarPrecos(
      validas.slice(0, 5).map((v) => ({ cnpj: v.cnpj, dataColeta: v.dataColeta, preco: v.preco, fonte: FONTE_PRECOS, edicaoId: edicao?.id ?? 0 })),
    );
    const r = await ingerirArquivoLpc(banco, bytes, URL_SEMANA, JANELA, agora);
    expect(r).toMatchObject({ situacao: "concluida", contagens: { gravadas: validas.length - 5, ja_existentes: 5 } });
    expect(dados.precos).toHaveLength(validas.length);
    expect(dados.edicoes).toHaveLength(1);
    expect(dados.edicoes[0].status).toBe("concluida");
  });

  test("coleta já gravada com outro preço: o valor gravado é mantido e a linha é rejeitada", async () => {
    const { banco, dados } = criarBancoEmMemoria();
    const alvo = validas[0];
    await banco.gravarPrecos([{ cnpj: alvo.cnpj, dataColeta: alvo.dataColeta, preco: "9.999", fonte: FONTE_PRECOS, edicaoId: 99 }]);
    const r = await ingerirArquivoLpc(banco, bytes, URL_SEMANA, JANELA, agora);
    expect(r).toMatchObject({
      situacao: "concluida",
      contagens: { gravadas: validas.length - 1, rejeitadas: 1, motivos: { conflito_com_existente: 1 } },
    });
    expect(dados.precos.find((p) => p.cnpj === alvo.cnpj && p.dataColeta === alvo.dataColeta)?.preco).toBe("9.999");
  });

  test("período anterior à janela: registra como fora da janela, sem preços", async () => {
    const { banco, dados } = criarBancoEmMemoria();
    const r = await ingerirArquivoLpc(banco, bytes, URL_SEMANA, "2026-11-01", agora);
    expect(r).toEqual({ situacao: "fora_da_janela", periodo, linhas: 40 });
    expect(dados.precos).toEqual([]);
    expect(dados.edicoes[0]).toMatchObject({ status: "fora_da_janela", contagens: { linhas: 40 } });
    expect(dados.links.get(URL_SEMANA)?.resultado).toBe("fora_da_janela");
  });

  test("outra execução cria a edição no mesmo instante: a ingestão retoma a dela", async () => {
    const { banco, dados } = criarBancoEmMemoria();
    dados.antesDeCriarEdicao = (p) => {
      dados.antesDeCriarEdicao = null;
      dados.edicoes.push({ id: 50, periodo: p, url: "outra", sha256: "b".repeat(64), status: "em_andamento", processadaEm: null, contagens: null });
    };
    const r = await ingerirArquivoLpc(banco, bytes, URL_SEMANA, JANELA, agora);
    expect(r.situacao).toBe("concluida");
    expect(dados.edicoes).toHaveLength(1);
    expect(dados.precos.every((p) => p.edicaoId === 50)).toBe(true);
  });

  test("arquivo fora do formato: lança FormatoInesperadoError e não registra nada", async () => {
    const { banco, dados } = criarBancoEmMemoria();
    const quebrado = zipSync({ "outro.xml": strToU8("<x/>") });
    await expect(ingerirArquivoLpc(banco, quebrado, URL_SEMANA, JANELA, agora)).rejects.toThrow(FormatoInesperadoError);
    expect(dados.edicoes).toEqual([]);
    expect(dados.links.size).toBe(0);
  });
});
