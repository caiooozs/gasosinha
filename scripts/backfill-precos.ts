/**
 * Carga única do histórico de preços: os arquivos semanais do LPC dos últimos 12 meses (T081, R7,
 * FR-017). ÁREA SENSÍVEL (Princípio IX): rodar contra produção só com aprovação humana (T082).
 *
 * Uso (Node 24, na raiz do repositório):
 *   npx tsx --env-file-if-exists=.env.local scripts/backfill-precos.ts --dry-run
 *   npx tsx --env-file-if-exists=.env.local scripts/backfill-precos.ts [--desde=AAAA-MM-DD]
 *
 * - Credenciais: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY, do .env.local. São segredos de servidor:
 *   nunca use o prefixo NEXT_PUBLIC_ nelas (Princípio II).
 * - Grava pelo mesmo caminho do sync-precos (`ingerirArquivoLpc`): rodar de novo não duplica nada
 *   (SC-006), e uma edição interrompida é retomada (FR-022).
 * - `--dry-run` só lê: baixa e confere cada arquivo e mostra o que seria gravado.
 * - Rode longe das 12:00 UTC (09:00 em Brasília), o horário do sync-precos-diario.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { dataEmSaoPaulo, inicioDaJanela, type Periodo } from "../supabase/functions/_shared/data-serial.ts";
import { criarBancoSupabase, type BancoGasosinha } from "../supabase/functions/_shared/infra/banco.ts";
import { ingerirArquivoLpc } from "../supabase/functions/_shared/infra/ingestao-precos.ts";
import { userAgent } from "../supabase/functions/_shared/infra/sync-postos.ts";
import { JANELA_MESES, URL_PAGINA_LPC } from "../supabase/functions/_shared/infra/sync-precos.ts";
import { lacunasNaJanela } from "../supabase/functions/_shared/lacunas.ts";
import { classificarLote, decidirEdicao } from "../supabase/functions/_shared/lote-precos.ts";
import { extrairLinksLpc, parseArquivoLpc, selecionarLinksPendentes } from "../supabase/functions/_shared/lpc.ts";
import { lerPlanilha } from "../supabase/functions/_shared/xlsx.ts";

const PAUSA_MS = 1000;

type Linha = {
  semana: string;
  situacao: string;
  linhas?: number;
  na_regiao?: number;
  gravadas?: number;
  ja_existentes?: number;
  rejeitadas?: number;
  sem_posto?: number;
  arquivo: string;
};

function argumentos(argv: readonly string[]): { dryRun: boolean; desde: string | null } {
  const dryRun = argv.includes("--dry-run");
  const desde = argv.find((a) => a.startsWith("--desde="))?.slice("--desde=".length) ?? null;
  if (desde !== null && !/^\d{4}-\d{2}-\d{2}$/.test(desde)) throw new Error(`--desde precisa ser AAAA-MM-DD, recebi "${desde}"`);
  const desconhecidos = argv.filter((a) => a !== "--dry-run" && !a.startsWith("--desde="));
  if (desconhecidos.length > 0) throw new Error(`argumento desconhecido: ${desconhecidos.join(" ")}`);
  return { dryRun, desde };
}

function credenciais(): { url: string; chave: string } {
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    throw new Error(
      "faltam SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no .env.local (veja o .env.example). " +
        "Elas são segredos de servidor: nunca use o prefixo NEXT_PUBLIC_.",
    );
  }
  return { url, chave };
}

const nomeDoArquivo = (url: string) => decodeURIComponent(url.split("/").pop() ?? url);
const textoDaSemana = (p: Periodo) => `${p.inicio} a ${p.fim}`;
const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

async function baixar(url: string): Promise<Response> {
  const resposta = await fetch(url, { headers: { "User-Agent": userAgent(process.env.NEXT_PUBLIC_SITE_URL) } });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status} em ${url}`);
  return resposta;
}

/** O que a ingestão faria com o arquivo, só com leituras (`--dry-run`). */
async function simular(banco: BancoGasosinha, bytes: Uint8Array, url: string, janelaDesde: string): Promise<{ linha: Linha; periodo: Periodo; cobriria: boolean }> {
  const arquivo = parseArquivoLpc(lerPlanilha(bytes));
  const { periodo } = arquivo;
  const decisao = decidirEdicao({ existente: await banco.buscarEdicao(periodo), periodo, janelaDesde });
  const base = { semana: textoDaSemana(periodo), arquivo: nomeDoArquivo(url), linhas: arquivo.linhas };
  if (decisao === "fora_da_janela" || decisao === "ja_processada") {
    return { linha: { ...base, situacao: decisao }, periodo, cobriria: false };
  }
  const cnpjs = [...new Set(arquivo.validas.map((v) => v.cnpj))];
  const [existentes, cadastrados] = await Promise.all([banco.coletasExistentes(cnpjs, periodo), banco.cnpjsCadastrados(cnpjs)]);
  const lote = classificarLote(arquivo.validas, existentes, cadastrados);
  return {
    linha: {
      ...base,
      situacao: decisao === "retomar" ? "retomaria" : "gravaria",
      na_regiao: arquivo.naRegiao,
      gravadas: lote.novas.length,
      ja_existentes: lote.jaExistentes,
      rejeitadas: arquivo.rejeitadas.length + lote.conflitos.length,
      sem_posto: lote.semPosto,
    },
    periodo,
    cobriria: true,
  };
}

async function edicoesConcluidas(cliente: SupabaseClient): Promise<Periodo[]> {
  const { data, error } = await cliente.from("edicoes_lpc").select("periodo_inicio, periodo_fim").eq("status", "concluida");
  if (error) throw new Error(`banco: ler edicoes_lpc: ${error.message}`);
  return (data as { periodo_inicio: string; periodo_fim: string }[]).map((e) => ({ inicio: e.periodo_inicio, fim: e.periodo_fim }));
}

async function principal(): Promise<number> {
  const { dryRun, desde } = argumentos(process.argv.slice(2));
  const { url, chave } = credenciais();
  const hoje = dataEmSaoPaulo(new Date());
  const janelaDesde = desde ?? inicioDaJanela(hoje, JANELA_MESES);

  const horaUtc = new Date().getUTCHours();
  if (horaUtc >= 11 && horaUtc <= 12) {
    console.warn("Aviso: perto das 12:00 UTC roda o sync-precos-diario; os logs dos dois vão se misturar.");
  }
  console.log(`${dryRun ? "SIMULAÇÃO (--dry-run, nada é gravado)" : "CARGA"} · janela desde ${janelaDesde} · hoje ${hoje}`);

  const cliente = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
  const banco = criarBancoSupabase(cliente);

  const links = extrairLinksLpc(await (await baixar(URL_PAGINA_LPC)).text());
  if (links.length === 0) throw new Error("a página do LPC não tem links de revendas");
  const pendentes = selecionarLinksPendentes(links, await banco.urlsVistas(), Number(janelaDesde.slice(0, 4)), Infinity);
  console.log(`${links.length} links na página; ${pendentes.length} ainda sem desfecho a partir de ${janelaDesde.slice(0, 4)}.`);

  const linhas: Linha[] = [];
  const cobertosNestaExecucao: Periodo[] = [];
  const erros: string[] = [];
  for (const [i, link] of pendentes.entries()) {
    if (i > 0) await esperar(PAUSA_MS);
    process.stdout.write(`[${i + 1}/${pendentes.length}] ${nomeDoArquivo(link)} … `);
    try {
      const bytes = new Uint8Array(await (await baixar(link)).arrayBuffer());
      if (dryRun) {
        const { linha, periodo, cobriria } = await simular(banco, bytes, link, janelaDesde);
        linhas.push(linha);
        if (cobriria) cobertosNestaExecucao.push(periodo);
        console.log(linha.situacao);
        continue;
      }
      const r = await ingerirArquivoLpc(banco, bytes, link, janelaDesde);
      const base = { semana: textoDaSemana(r.periodo), situacao: r.situacao, arquivo: nomeDoArquivo(link) };
      if (r.situacao === "concluida") {
        const { linhas: total, na_regiao, gravadas, ja_existentes, rejeitadas, sem_posto } = r.contagens;
        linhas.push({ ...base, linhas: total, na_regiao, gravadas, ja_existentes, rejeitadas, sem_posto });
      } else {
        linhas.push({ ...base, linhas: r.situacao === "fora_da_janela" ? r.linhas : undefined });
      }
      console.log(r.situacao);
    } catch (erro) {
      // Um arquivo com problema não derruba a carga: fica sem desfecho e volta na próxima execução.
      const mensagem = erro instanceof Error ? erro.message : String(erro);
      erros.push(`${nomeDoArquivo(link)}: ${mensagem}`);
      console.log(`ERRO: ${mensagem}`);
    }
  }

  if (!dryRun) await banco.atualizarUltimaEdicaoFim();

  linhas.sort((a, b) => a.semana.localeCompare(b.semana));
  const dentro = linhas.filter((l) => l.situacao !== "fora_da_janela");
  const fora = linhas.filter((l) => l.situacao === "fora_da_janela");

  console.log("\nSemanas dentro da janela:");
  if (dentro.length > 0) console.table(dentro);
  else console.log("(nenhum arquivo novo)");

  console.log(`\nFora da janela (registradas sem preços, para não serem baixadas de novo): ${fora.length}`);
  for (const l of fora) console.log(`  ${l.semana} · ${l.arquivo}`);

  const cobertos = [...(await edicoesConcluidas(cliente)), ...cobertosNestaExecucao];
  const lacunas = lacunasNaJanela(cobertos, janelaDesde, hoje);
  console.log(`\nSemanas faltando na janela${dryRun ? " (depois desta carga)" : ""}: ${lacunas.length === 0 ? "nenhuma" : ""}`);
  for (const l of lacunas) console.log(`  ${textoDaSemana(l)}`);
  if (lacunas.length > 0) console.log("  (a última pode ser só a semana corrente, ainda não publicada.)");

  if (erros.length > 0) {
    console.log(`\n${erros.length} arquivo(s) com erro, que voltam na próxima execução:`);
    for (const e of erros) console.log(`  ${e}`);
    return 1;
  }
  return 0;
}

principal().then(
  (codigo) => process.exit(codigo),
  (erro: unknown) => {
    console.error(`\nFalhou: ${erro instanceof Error ? erro.message : String(erro)}`);
    process.exit(1);
  },
);
