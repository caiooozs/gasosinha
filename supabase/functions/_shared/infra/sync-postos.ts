/**
 * O que a Edge Function sync-postos faz (T035), sem depender do Deno: recebe o banco, o ambiente e
 * o fetch por parâmetro, para ser testada. ÁREA SENSÍVEL (Princípio IX).
 * Contrato: specs/001-gas-price-map/contracts/edge-functions.md.
 */
import { FormatoInesperadoError } from "../erros.ts";
import { planejarSincronizacaoPostos } from "../retrato-postos.ts";
import { parseEnvelopeRevendedores, parseRevendedor, type PostoNormalizado } from "../revendedores.ts";
import type { BancoGasosinha } from "./banco.ts";
import { FonteIndisponivelError, descreverErro, encerrarExecucao, recusarRequisicao, type Resposta } from "./execucao.ts";

export const URL_REVENDEDORES = "https://revendedoresapi.anp.gov.br/v1/combustivel";
const MAXIMO_PAGINAS = 10;

export type AmbienteSync = {
  cronSecret: string;
  siteUrl?: string;
  revendedoresApiUrl?: string;
  lpcPaginaUrl?: string;
};

export type DependenciasSync = {
  banco: BancoGasosinha;
  ambiente: AmbienteSync;
  fetchFn?: typeof fetch;
  agora?: () => Date;
};

export function userAgent(siteUrl?: string): string {
  return siteUrl ? `Gasosinha/1.0 (+${siteUrl})` : "Gasosinha/1.0";
}

async function buscarJson(fetchFn: typeof fetch, url: string, siteUrl?: string): Promise<unknown> {
  let resposta: Response;
  try {
    resposta = await fetchFn(url, { headers: { "User-Agent": userAgent(siteUrl), Accept: "application/json" } });
  } catch (erro) {
    throw new FonteIndisponivelError(`sem resposta de ${url}: ${descreverErro(erro)}`);
  }
  if (!resposta.ok) throw new FonteIndisponivelError(`HTTP ${resposta.status} em ${url}`);
  try {
    return await resposta.json();
  } catch {
    throw new FormatoInesperadoError("json_invalido", url);
  }
}

export async function executarSyncPostos(
  requisicao: { metodo: string; segredo: string | null },
  deps: DependenciasSync,
): Promise<Resposta> {
  const recusa = recusarRequisicao(requisicao.metodo, requisicao.segredo, deps.ambiente.cronSecret);
  if (recusa) return recusa;

  const fetchFn = deps.fetchFn ?? fetch;
  const agora = deps.agora ?? (() => new Date());
  const iniciadaEm = agora().toISOString();
  let resposta: Resposta;
  let contagens: Record<string, unknown> | null = null;
  let detalhe: string | null = null;

  try {
    const base = deps.ambiente.revendedoresApiUrl ?? URL_REVENDEDORES;
    const registros: unknown[] = [];
    let totalPagina = 1;
    for (let pagina = 1; pagina <= totalPagina && pagina <= MAXIMO_PAGINAS; pagina++) {
      const json = await buscarJson(fetchFn, `${base}?uf=PE&numeropagina=${pagina}`, deps.ambiente.siteUrl);
      const envelope = parseEnvelopeRevendedores(json);
      registros.push(...envelope.registros);
      totalPagina = envelope.totalPagina;
    }

    const porCnpj = new Map<string, PostoNormalizado>();
    let rejeitados = 0;
    for (const registro of registros) {
      const r = parseRevendedor(registro);
      if (r.tipo === "valido") porCnpj.set(r.posto.cnpj, r.posto);
      else if (r.tipo === "rejeitado") rejeitados++;
    }
    const recebidos = [...porCnpj.values()];

    const plano = planejarSincronizacaoPostos(await deps.banco.lerPostos(), recebidos);
    if (!plano.valido) {
      throw new FormatoInesperadoError("retrato_incompleto", `${recebidos.length} postos recebidos`);
    }

    const em = agora().toISOString();
    await deps.banco.gravarPostos([...plano.inserir, ...plano.atualizar, ...plano.reativar], em);
    await deps.banco.desativarPostos(plano.desativar, em);
    await deps.banco.marcarSucesso("cadastro", em);

    contagens = {
      lidos: registros.length,
      na_regiao: recebidos.length,
      inseridos: plano.inserir.length,
      atualizados: plano.atualizar.length,
      inalterados: plano.inalterados.length,
      rejeitados,
      localizacao_invalida: recebidos.filter((p) => p.localizacaoInvalida).length,
      desativados: plano.desativar.length,
      reativados: plano.reativar.length,
    };
    resposta = { status: 200, corpo: { ok: true, fonte: "cadastro", ...contagens } };
  } catch (erro) {
    detalhe = descreverErro(erro);
    resposta = respostaDeErro(erro, "cadastro");
  }

  await encerrarExecucao(
    deps.banco,
    {
      fonte: "cadastro",
      iniciadaEm,
      terminadaEm: agora().toISOString(),
      resultado: resposta.status === 200 ? "ok" : "falha",
      detalhe,
      contagens,
    },
    agora(),
  );
  return resposta;
}

/** 502 para fonte fora do ar, 422 para formato inesperado, 500 para o resto. */
export function respostaDeErro(erro: unknown, fonte: "cadastro" | "precos", url?: string): Resposta {
  if (erro instanceof FonteIndisponivelError) {
    return { status: 502, corpo: { ok: false, fonte, erro: "fonte_indisponivel", ...(url ? { url } : {}) } };
  }
  if (erro instanceof FormatoInesperadoError) {
    const codigo = erro.motivo === "retrato_incompleto" ? "retrato_incompleto" : "formato_inesperado";
    return { status: 422, corpo: { ok: false, fonte, erro: codigo, ...(url ? { url } : {}) } };
  }
  return { status: 500, corpo: { ok: false, fonte, erro: "erro_interno" } };
}
