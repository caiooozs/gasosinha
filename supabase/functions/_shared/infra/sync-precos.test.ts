import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test, vi } from "vitest";
import { extrairLinksLpc } from "../lpc.ts";
import { criarBancoEmMemoria } from "./banco-em-memoria.ts";
import { executarSyncPrecos } from "./sync-precos.ts";

const fixture = (nome: string) => readFileSync(fileURLToPath(new URL(`../fixtures/${nome}`, import.meta.url)));
const html = fixture("lpc-pagina-amostra.html").toString("utf8");
const xlsx = new Uint8Array(fixture("lpc-amostra.xlsx"));
const links = extrairLinksLpc(html);
const PAGINA = "https://lpc.teste/ultimas-semanas";
const SEGREDO = "segredo-de-teste";
const POST = { metodo: "POST", segredo: SEGREDO };
// 04/11/2026: a janela de 12 meses começa em 04/11/2025, então entram os links de 2025 e 2026.
const agora = () => new Date("2026-11-04T15:00:00Z");
const pendentesNaJanela = links.filter((l) => /\/arquivos-lpc\/(2025|2026)\//.test(l));

function fetchFalso(opcoes: { pagina?: number; arquivo?: number | Uint8Array } = {}) {
  return vi.fn(async (entrada: string | URL | Request) => {
    const url = String(entrada);
    if (url === PAGINA) return new Response(opcoes.pagina ? "erro" : html, { status: opcoes.pagina ?? 200 });
    if (typeof opcoes.arquivo === "number") return new Response("erro", { status: opcoes.arquivo });
    return new Response(new Uint8Array(opcoes.arquivo ?? xlsx), { status: 200 });
  });
}

function preparar() {
  const { banco, dados } = criarBancoEmMemoria();
  const deps = (fetchFn: ReturnType<typeof fetchFalso>) => ({
    banco,
    fetchFn: fetchFn as unknown as typeof fetch,
    agora,
    ambiente: { cronSecret: SEGREDO, lpcPaginaUrl: PAGINA },
  });
  return { banco, dados, deps };
}

describe("executarSyncPrecos", () => {
  test("405 e 401 antes de qualquer download", async () => {
    const { deps } = preparar();
    const fetchFn = fetchFalso();
    expect((await executarSyncPrecos({ metodo: "GET", segredo: SEGREDO }, deps(fetchFn))).status).toBe(405);
    expect((await executarSyncPrecos({ metodo: "POST", segredo: "x" }, deps(fetchFn))).status).toBe(401);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  test("baixa no máximo 3 arquivos, do ano mais novo; a republicação do mesmo período não grava de novo", async () => {
    const { deps } = preparar();
    const fetchFn = fetchFalso();
    const r = await executarSyncPrecos(POST, deps(fetchFn));
    expect(r.status).toBe(200);
    const corpo = r.corpo as { edicoes: Record<string, unknown>[]; pendentes: number };
    expect(corpo.edicoes).toHaveLength(3);
    expect(corpo.edicoes[0]).toMatchObject({ periodo: "2026-10-18/2026-10-24", gravadas: 20, na_regiao: 20 });
    // O arquivo falso é o mesmo para todos os links: os outros dois são o mesmo período.
    expect(corpo.edicoes[1]).toEqual({ periodo: "2026-10-18/2026-10-24", ja_processada: true });
    expect(corpo.pendentes).toBe(pendentesNaJanela.length - 3);
    const baixados = fetchFn.mock.calls.map(([u]) => String(u)).filter((u) => u !== PAGINA);
    expect(baixados).toEqual(pendentesNaJanela.slice(0, 3));
    expect(baixados.every((u) => !/\/(2022|2023|2024)\//.test(u))).toBe(true);
  });

  test("atualiza ultima_ok_em e ultima_edicao_fim, e o aviso de preços fica desligado", async () => {
    const { dados, deps } = preparar();
    await executarSyncPrecos(POST, deps(fetchFalso()));
    expect(dados.estado.precos).toMatchObject({
      ultimaOkEm: agora().toISOString(),
      ultimaEdicaoFim: "2026-10-24",
      emProblema: false,
    });
    expect(dados.execucoes.at(-1)).toMatchObject({ fonte: "precos", resultado: "ok" });
  });

  test("a execução seguinte continua de onde parou, sem repetir URLs", async () => {
    const { dados, deps } = preparar();
    await executarSyncPrecos(POST, deps(fetchFalso()));
    const fetchFn = fetchFalso();
    await executarSyncPrecos(POST, deps(fetchFn));
    const baixados = fetchFn.mock.calls.map(([u]) => String(u)).filter((u) => u !== PAGINA);
    expect(baixados).toEqual(pendentesNaJanela.slice(3, 6));
    expect(dados.links.size).toBe(6);
  });

  test("sem nada novo: edicoes vazio e pendentes 0 (SC-006)", async () => {
    const { dados, deps } = preparar();
    for (const url of links) dados.links.set(url, { edicaoId: 1, resultado: "concluida" });
    const r = await executarSyncPrecos(POST, deps(fetchFalso()));
    expect(r).toEqual({ status: 200, corpo: { ok: true, fonte: "precos", edicoes: [], pendentes: 0 } });
  });

  test("página do LPC fora do ar: 502 e execução com falha", async () => {
    const { dados, deps } = preparar();
    const r = await executarSyncPrecos(POST, deps(fetchFalso({ pagina: 500 })));
    expect(r).toEqual({ status: 502, corpo: { ok: false, fonte: "precos", erro: "fonte_indisponivel" } });
    expect(dados.execucoes.at(-1)?.resultado).toBe("falha");
    expect(dados.estado.precos).toMatchObject({ emProblema: true, tipoProblema: "falha" });
  });

  test("arquivo fora do formato: 422 com a URL, e a edição não é registrada", async () => {
    const { dados, deps } = preparar();
    const r = await executarSyncPrecos(POST, deps(fetchFalso({ arquivo: new TextEncoder().encode("não é xlsx") })));
    expect(r).toEqual({
      status: 422,
      corpo: { ok: false, fonte: "precos", erro: "formato_inesperado", url: pendentesNaJanela[0] },
    });
    expect(dados.edicoes).toEqual([]);
    expect(dados.links.size).toBe(0);
  });

  test("página sem links de revendas: 422", async () => {
    const { banco } = preparar();
    const fetchFn = vi.fn(async () => new Response("<html>nada</html>", { status: 200 }));
    const r = await executarSyncPrecos(POST, {
      banco,
      fetchFn: fetchFn as unknown as typeof fetch,
      agora,
      ambiente: { cronSecret: SEGREDO, lpcPaginaUrl: PAGINA },
    });
    expect(r).toEqual({ status: 422, corpo: { ok: false, fonte: "precos", erro: "formato_inesperado" } });
  });
});
