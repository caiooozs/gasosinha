import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test, vi } from "vitest";
import { criarBancoEmMemoria } from "./banco-em-memoria.ts";
import { executarSyncPostos } from "./sync-postos.ts";

type Registro = Record<string, unknown> & { cnpj: string; municipio: string };
type Envelope = Record<string, unknown> & { data: Registro[]; searchPageFilter: Record<string, unknown> };

const envelope = JSON.parse(
  readFileSync(fileURLToPath(new URL("../fixtures/revendedores-pe-amostra.json", import.meta.url)), "utf8"),
) as Envelope;
const daRmr = envelope.data.filter((r) => !["CARUARU", "PETROLINA"].includes(r.municipio));
const comRegistros = (data: Registro[]): Envelope => ({ ...envelope, data });

const respostaJson = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });
const fetchCom = (corpo: unknown, status = 200) => vi.fn(async () => respostaJson(corpo, status));

const SEGREDO = "segredo-de-teste";
const POST = { metodo: "POST", segredo: SEGREDO };
const agora = () => new Date("2026-11-04T09:00:00Z");

function preparar() {
  const { banco, dados } = criarBancoEmMemoria();
  const deps = (fetchFn: typeof fetch, siteUrl?: string) => ({
    banco,
    fetchFn,
    agora,
    ambiente: { cronSecret: SEGREDO, siteUrl, revendedoresApiUrl: "https://api.teste/v1/combustivel" },
  });
  return { banco, dados, deps };
}

describe("executarSyncPostos: requisição", () => {
  test("método diferente de POST: 405, sem chamar a API nem registrar execução", async () => {
    const { dados, deps } = preparar();
    const fetchFn = fetchCom(envelope);
    const r = await executarSyncPostos({ metodo: "GET", segredo: SEGREDO }, deps(fetchFn));
    expect(r.status).toBe(405);
    expect(fetchFn).not.toHaveBeenCalled();
    expect(dados.execucoes).toEqual([]);
  });

  test("segredo ausente ou errado: 401", async () => {
    const { deps } = preparar();
    expect((await executarSyncPostos({ metodo: "POST", segredo: null }, deps(fetchCom(envelope)))).status).toBe(401);
    expect((await executarSyncPostos({ metodo: "POST", segredo: "errado" }, deps(fetchCom(envelope)))).status).toBe(401);
  });
});

describe("executarSyncPostos: sincronização", () => {
  test("primeira execução: grava os postos da RMR, conta a localização inválida e registra sucesso", async () => {
    const { dados, deps } = preparar();
    const fetchFn = fetchCom(envelope);
    const r = await executarSyncPostos(POST, deps(fetchFn, "https://gasosinha.example"));
    expect(r).toEqual({
      status: 200,
      corpo: {
        ok: true,
        fonte: "cadastro",
        lidos: 12,
        na_regiao: daRmr.length,
        inseridos: daRmr.length,
        atualizados: 0,
        inalterados: 0,
        rejeitados: 0,
        localizacao_invalida: 1,
        desativados: 0,
        reativados: 0,
      },
    });
    expect(dados.postos.size).toBe(daRmr.length);
    expect(fetchFn).toHaveBeenCalledWith("https://api.teste/v1/combustivel?uf=PE&numeropagina=1", {
      headers: { "User-Agent": "Gasosinha/1.0 (+https://gasosinha.example)", Accept: "application/json" },
    });
    expect(dados.execucoes.at(-1)).toMatchObject({ fonte: "cadastro", resultado: "ok", detalhe: null });
    expect(dados.estado.cadastro.ultimaOkEm).toBe(agora().toISOString());
    expect(dados.estado.cadastro.emProblema).toBe(false);
  });

  test("segunda execução sem mudança na fonte não escreve nada (SC-006)", async () => {
    const { dados, deps } = preparar();
    await executarSyncPostos(POST, deps(fetchCom(envelope)));
    const escritasAntes = dados.escritas.gravarPostos;
    const r = await executarSyncPostos(POST, deps(fetchCom(envelope)));
    expect(r.corpo).toMatchObject({ inseridos: 0, atualizados: 0, inalterados: daRmr.length, desativados: 0, reativados: 0 });
    expect(dados.escritas.gravarPostos).toBe(escritasAntes);
  });

  test("posto que some do retrato é desativado; quando volta, é reativado", async () => {
    const { dados, deps } = preparar();
    await executarSyncPostos(POST, deps(fetchCom(envelope)));
    const sumiu = daRmr[0].cnpj;
    const r1 = await executarSyncPostos(POST, deps(fetchCom(comRegistros(envelope.data.filter((x) => x.cnpj !== sumiu)))));
    expect(r1.corpo).toMatchObject({ desativados: 1 });
    expect(dados.postos.get(sumiu)?.posto.ativo).toBe(false);
    const r2 = await executarSyncPostos(POST, deps(fetchCom(envelope)));
    expect(r2.corpo).toMatchObject({ reativados: 1, inseridos: 0 });
    expect(dados.postos.get(sumiu)?.posto.ativo).toBe(true);
  });

  test("retrato com menos de 80% dos ativos: 422 retrato_incompleto e nada é desativado", async () => {
    const { dados, deps } = preparar();
    await executarSyncPostos(POST, deps(fetchCom(envelope)));
    const r = await executarSyncPostos(POST, deps(fetchCom(comRegistros(daRmr.slice(0, 5)))));
    expect(r).toEqual({ status: 422, corpo: { ok: false, fonte: "cadastro", erro: "retrato_incompleto" } });
    expect(dados.escritas.desativarPostos).toBe(0);
    expect(dados.execucoes.at(-1)?.resultado).toBe("falha");
    expect(dados.estado.cadastro).toMatchObject({ emProblema: true, tipoProblema: "falha" });
  });

  test("API fora do ar ou com erro HTTP: 502", async () => {
    const { dados, deps } = preparar();
    const r = await executarSyncPostos(POST, deps(fetchCom({}, 503)));
    expect(r).toEqual({ status: 502, corpo: { ok: false, fonte: "cadastro", erro: "fonte_indisponivel" } });
    const semRede = vi.fn(async () => {
      throw new TypeError("network error");
    });
    expect((await executarSyncPostos(POST, deps(semRede))).status).toBe(502);
    expect(dados.execucoes.every((e) => e.resultado === "falha")).toBe(true);
  });

  test("envelope fora do formato: 422 formato_inesperado", async () => {
    const { deps } = preparar();
    const r = await executarSyncPostos(POST, deps(fetchCom({ ...envelope, succeeded: false })));
    expect(r).toEqual({ status: 422, corpo: { ok: false, fonte: "cadastro", erro: "formato_inesperado" } });
  });

  test("busca as páginas até totalPagina", async () => {
    const { dados, deps } = preparar();
    const pagina1 = { ...comRegistros(daRmr.slice(0, 4)), searchPageFilter: { ...envelope.searchPageFilter, totalPagina: 2 } };
    const pagina2 = { ...comRegistros(daRmr.slice(4)), searchPageFilter: { ...envelope.searchPageFilter, totalPagina: 2 } };
    const fetchFn = vi.fn(async (url: string | URL | Request) =>
      respostaJson(String(url).endsWith("numeropagina=1") ? pagina1 : pagina2),
    );
    const r = await executarSyncPostos(POST, deps(fetchFn as unknown as typeof fetch));
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(r.corpo).toMatchObject({ inseridos: daRmr.length });
    expect(dados.postos.size).toBe(daRmr.length);
  });
});
