/**
 * O que a Edge Function sync-precos faz (T036), sem depender do Deno. ÁREA SENSÍVEL (Princípio IX).
 * Contrato: specs/001-gas-price-map/contracts/edge-functions.md.
 */
import { dataEmSaoPaulo, inicioDaJanela } from "../data-serial.ts";
import { FormatoInesperadoError } from "../erros.ts";
import { extrairLinksLpc, selecionarLinksPendentes } from "../lpc.ts";
import { FonteIndisponivelError, descreverErro, encerrarExecucao, recusarRequisicao, type Resposta } from "./execucao.ts";
import { ingerirArquivoLpc, type ResultadoIngestao } from "./ingestao-precos.ts";
import { respostaDeErro, userAgent, type DependenciasSync } from "./sync-postos.ts";

export const URL_PAGINA_LPC =
  "https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas";
/** No máximo 3 arquivos por execução, para ficar abaixo de 2 s de CPU (R6). */
export const EDICOES_POR_EXECUCAO = 3;
export const JANELA_MESES = 12;

async function baixar(fetchFn: typeof fetch, url: string, siteUrl?: string): Promise<Response> {
  let resposta: Response;
  try {
    resposta = await fetchFn(url, { headers: { "User-Agent": userAgent(siteUrl) } });
  } catch (erro) {
    throw new FonteIndisponivelError(`sem resposta de ${url}: ${descreverErro(erro)}`);
  }
  if (!resposta.ok) throw new FonteIndisponivelError(`HTTP ${resposta.status} em ${url}`);
  return resposta;
}

function resumir(r: ResultadoIngestao): Record<string, unknown> {
  const periodo = `${r.periodo.inicio}/${r.periodo.fim}`;
  if (r.situacao === "concluida") return { periodo, ...r.contagens };
  if (r.situacao === "fora_da_janela") return { periodo, fora_da_janela: true };
  return { periodo, ja_processada: true };
}

export async function executarSyncPrecos(
  requisicao: { metodo: string; segredo: string | null },
  deps: DependenciasSync,
): Promise<Resposta> {
  const recusa = recusarRequisicao(requisicao.metodo, requisicao.segredo, deps.ambiente.cronSecret);
  if (recusa) return recusa;

  const fetchFn = deps.fetchFn ?? fetch;
  const agora = deps.agora ?? (() => new Date());
  const iniciadaEm = agora().toISOString();
  const edicoes: Record<string, unknown>[] = [];
  let resposta: Resposta;
  let detalhe: string | null = null;
  let urlAtual: string | undefined;

  try {
    const janelaDesde = inicioDaJanela(dataEmSaoPaulo(agora()), JANELA_MESES);
    const pagina = await baixar(fetchFn, deps.ambiente.lpcPaginaUrl ?? URL_PAGINA_LPC, deps.ambiente.siteUrl);
    const links = extrairLinksLpc(await pagina.text());
    if (links.length === 0) throw new FormatoInesperadoError("sem_links", "a página do LPC não tem links de revendas");

    const pendentes = selecionarLinksPendentes(links, await deps.banco.urlsVistas(), Number(janelaDesde.slice(0, 4)), Infinity);
    const nestaExecucao = pendentes.slice(0, EDICOES_POR_EXECUCAO);
    for (const url of nestaExecucao) {
      urlAtual = url;
      const arquivo = await baixar(fetchFn, url, deps.ambiente.siteUrl);
      const bytes = new Uint8Array(await arquivo.arrayBuffer());
      edicoes.push(resumir(await ingerirArquivoLpc(deps.banco, bytes, url, janelaDesde, agora())));
    }
    urlAtual = undefined;

    await deps.banco.marcarSucesso("precos", agora().toISOString());
    resposta = {
      status: 200,
      corpo: { ok: true, fonte: "precos", edicoes, pendentes: pendentes.length - nestaExecucao.length },
    };
  } catch (erro) {
    detalhe = descreverErro(erro);
    resposta = respostaDeErro(erro, "precos", urlAtual);
  }

  // As edições concluídas antes de uma falha também contam para o atraso.
  try {
    await deps.banco.atualizarUltimaEdicaoFim();
  } catch (erro) {
    console.error(`falha ao atualizar ultima_edicao_fim: ${descreverErro(erro)}`);
  }
  await encerrarExecucao(
    deps.banco,
    {
      fonte: "precos",
      iniciadaEm,
      terminadaEm: agora().toISOString(),
      resultado: resposta.status === 200 ? "ok" : "falha",
      detalhe,
      contagens: { edicoes },
    },
    agora(),
  );
  return resposta;
}
