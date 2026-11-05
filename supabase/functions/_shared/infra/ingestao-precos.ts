/**
 * Ingestão de um arquivo semanal do LPC (T034). ÁREA SENSÍVEL (Princípio IX).
 *
 * Usada pelo sync-precos e pelo script de carga do histórico, pelo mesmo caminho.
 *
 * Retomada (FR-022): a edição nasce `em_andamento` e só passa a `concluida` depois que todos os
 * preços foram gravados. Se a execução cair antes disso, a URL não entra em links_lpc e a próxima
 * execução retoma a edição. Os upserts podem se repetir sem efeito.
 */
import type { Periodo } from "../data-serial.ts";
import { classificarLote, decidirEdicao } from "../lote-precos.ts";
import { parseArquivoLpc } from "../lpc.ts";
import { lerPlanilha } from "../xlsx.ts";
import type { BancoGasosinha, EdicaoRegistrada } from "./banco.ts";

export const FONTE_PRECOS = "ANP – Levantamento de Preços de Combustíveis";

export type ContagensEdicao = {
  linhas: number;
  na_regiao: number;
  gravadas: number;
  ja_existentes: number;
  rejeitadas: number;
  sem_posto: number;
  motivos: Record<string, number>;
};

export type ResultadoIngestao =
  | { situacao: "concluida"; periodo: Periodo; contagens: ContagensEdicao }
  | { situacao: "ja_processada"; periodo: Periodo }
  | { situacao: "fora_da_janela"; periodo: Periodo; linhas: number };

async function calcularSha256(bytes: Uint8Array): Promise<string> {
  const copia = new Uint8Array(bytes); // garante um ArrayBuffer próprio para o crypto.subtle
  const resumo = await crypto.subtle.digest("SHA-256", copia);
  return [...new Uint8Array(resumo)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function ingerirArquivoLpc(
  banco: BancoGasosinha,
  bytes: Uint8Array,
  url: string,
  janelaDesde: string,
  agora: Date = new Date(),
): Promise<ResultadoIngestao> {
  const em = agora.toISOString();
  const sha256 = await calcularSha256(bytes);
  const arquivo = parseArquivoLpc(lerPlanilha(bytes)); // FormatoInesperadoError sobe: nada é registrado
  const { periodo } = arquivo;

  let edicao: EdicaoRegistrada | null = await banco.buscarEdicao(periodo);
  let decisao = decidirEdicao({ existente: edicao, periodo, janelaDesde });
  if (decisao === "nova") {
    edicao = await banco.criarEdicao({ periodo, url, sha256 });
    if (!edicao) {
      // Outra execução criou a edição do mesmo período ao mesmo tempo: decide de novo com ela.
      edicao = await banco.buscarEdicao(periodo);
      decisao = decidirEdicao({ existente: edicao, periodo, janelaDesde });
    }
  }
  if (!edicao && decisao !== "fora_da_janela") {
    throw new Error(`edição do período ${periodo.inicio}/${periodo.fim} não encontrada depois de criada`);
  }

  if (decisao === "ja_processada" && edicao) {
    await banco.registrarLink(url, edicao.id, "ja_processada", em);
    return { situacao: "ja_processada", periodo };
  }

  if (decisao === "fora_da_janela") {
    const id = await banco.registrarEdicaoForaDaJanela({
      periodo,
      url,
      sha256,
      contagens: { linhas: arquivo.linhas },
      em,
    });
    await banco.registrarLink(url, id, "fora_da_janela", em);
    return { situacao: "fora_da_janela", periodo, linhas: arquivo.linhas };
  }

  // Edição nova ou retomada.
  const id = (edicao as EdicaoRegistrada).id;
  const cnpjs = [...new Set(arquivo.validas.map((v) => v.cnpj))];
  const [existentes, cadastrados] = await Promise.all([
    banco.coletasExistentes(cnpjs, periodo),
    banco.cnpjsCadastrados(cnpjs),
  ]);
  const lote = classificarLote(arquivo.validas, existentes, cadastrados);
  const gravadas = await banco.gravarPrecos(
    lote.novas.map((v) => ({ cnpj: v.cnpj, dataColeta: v.dataColeta, preco: v.preco, fonte: FONTE_PRECOS, edicaoId: id })),
  );

  const motivos: Record<string, number> = {};
  for (const { motivo } of [...arquivo.rejeitadas, ...lote.conflitos]) motivos[motivo] = (motivos[motivo] ?? 0) + 1;
  const contagens: ContagensEdicao = {
    linhas: arquivo.linhas,
    na_regiao: arquivo.naRegiao,
    gravadas,
    // Linhas novas que já tinham sido gravadas por outra execução também contam como existentes.
    ja_existentes: lote.jaExistentes + (lote.novas.length - gravadas),
    rejeitadas: arquivo.rejeitadas.length + lote.conflitos.length,
    sem_posto: lote.semPosto,
    motivos,
  };

  await banco.concluirEdicao(id, contagens, em);
  await banco.registrarLink(url, id, "concluida", em);
  return { situacao: "concluida", periodo, contagens };
}
