/**
 * Acesso ao banco das Edge Functions e do script de carga. ÁREA SENSÍVEL (Princípio IX).
 *
 * A orquestração (ingestão, sync-postos, sync-precos) fala com o banco só por esta interface. A
 * implementação real usa o supabase-js com a service role; os testes usam a versão em memória
 * (banco-em-memoria.ts). Nenhuma função daqui lê variáveis de ambiente.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EstadoFonte, Fonte } from "../alerta.ts";
import type { Periodo } from "../data-serial.ts";
import type { ColetaExistente, StatusEdicao } from "../lote-precos.ts";
import { canonicalizarPreco } from "../preco.ts";
import type { PostoGravado } from "../retrato-postos.ts";
import type { PostoNormalizado } from "../schemas.ts";

export type Execucao = {
  fonte: Fonte;
  iniciadaEm: string;
  terminadaEm: string;
  resultado: "ok" | "falha";
  detalhe: string | null;
  contagens: Record<string, unknown> | null;
};

export type EdicaoRegistrada = { id: number; status: StatusEdicao };
export type ResultadoLink = "concluida" | "ja_processada" | "fora_da_janela";
export type NovaColeta = { cnpj: string; dataColeta: string; preco: string; fonte: string; edicaoId: number };

export interface BancoGasosinha {
  lerEstadoFontes(): Promise<EstadoFonte[]>;
  /** Grava só os campos de problema (em_problema, tipo_problema, problema_desde). */
  gravarProblemaDaFonte(estado: EstadoFonte): Promise<void>;
  marcarSucesso(fonte: Fonte, em: string): Promise<void>;
  /** estado_fontes.precos.ultima_edicao_fim = o maior periodo_fim das edições concluídas. */
  atualizarUltimaEdicaoFim(): Promise<void>;
  ultimaExecucao(fonte: Fonte): Promise<"ok" | "falha" | null>;
  registrarExecucao(execucao: Execucao): Promise<void>;

  urlsVistas(): Promise<Set<string>>;
  buscarEdicao(periodo: Periodo): Promise<EdicaoRegistrada | null>;
  /** Insere a edição em andamento. Devolve `null` se outra execução já criou a do mesmo período. */
  criarEdicao(dados: { periodo: Periodo; url: string; sha256: string }): Promise<EdicaoRegistrada | null>;
  /** Registra (ou atualiza) a edição como fora da janela, sem preços. Devolve o id. */
  registrarEdicaoForaDaJanela(dados: {
    periodo: Periodo;
    url: string;
    sha256: string;
    contagens: Record<string, unknown>;
    em: string;
  }): Promise<number>;
  concluirEdicao(id: number, contagens: Record<string, unknown>, em: string): Promise<void>;
  registrarLink(url: string, edicaoId: number, resultado: ResultadoLink, em: string): Promise<void>;
  coletasExistentes(cnpjs: readonly string[], periodo: Periodo): Promise<ColetaExistente[]>;
  cnpjsCadastrados(cnpjs: readonly string[]): Promise<Set<string>>;
  /** Grava com `on conflict do nothing`. Devolve quantas linhas foram de fato inseridas. */
  gravarPrecos(coletas: readonly NovaColeta[]): Promise<number>;

  lerPostos(): Promise<PostoGravado[]>;
  /** Insere ou atualiza com os dados recebidos, `ativo = true` e `atualizado_em = em`. */
  gravarPostos(postos: readonly PostoNormalizado[], em: string): Promise<void>;
  desativarPostos(cnpjs: readonly string[], em: string): Promise<void>;
}

// --- Implementação com o supabase-js ---

const LOTE = 500;
const PAGINA = 1000; // o PostgREST devolve no máximo 1000 linhas por consulta
const PRODUTO = "gasolina_comum";

function emLotes<T>(itens: readonly T[], tamanho: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) lotes.push(itens.slice(i, i + tamanho));
  return lotes;
}

function checar(erro: { message: string } | null, operacao: string): void {
  if (erro) throw new Error(`banco: ${operacao}: ${erro.message}`);
}

type LinhaEstado = {
  fonte: Fonte;
  ultima_ok_em: string | null;
  ultima_edicao_fim: string | null;
  em_problema: boolean;
  tipo_problema: EstadoFonte["tipoProblema"];
  problema_desde: string | null;
};

type LinhaPosto = {
  cnpj: string;
  razao_social: string;
  bandeira: string | null;
  endereco: string;
  bairro: string | null;
  cep: string | null;
  municipio: string;
  uf: string;
  lat: number | null;
  lng: number | null;
  acuracia_estimada: string | null;
  origem_localizacao: string | null;
  ativo: boolean;
};

export function criarBancoSupabase(cliente: SupabaseClient): BancoGasosinha {
  async function lerTudo<T>(consulta: (de: number, ate: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>, operacao: string): Promise<T[]> {
    const linhas: T[] = [];
    for (let de = 0; ; de += PAGINA) {
      const { data, error } = await consulta(de, de + PAGINA - 1);
      checar(error, operacao);
      const pagina = (data ?? []) as T[];
      linhas.push(...pagina);
      if (pagina.length < PAGINA) return linhas;
    }
  }

  return {
    async lerEstadoFontes() {
      const { data, error } = await cliente
        .from("estado_fontes")
        .select("fonte, ultima_ok_em, ultima_edicao_fim, em_problema, tipo_problema, problema_desde");
      checar(error, "ler estado_fontes");
      return ((data ?? []) as LinhaEstado[]).map((l) => ({
        fonte: l.fonte,
        ultimaOkEm: l.ultima_ok_em,
        ultimaEdicaoFim: l.ultima_edicao_fim,
        emProblema: l.em_problema,
        tipoProblema: l.tipo_problema,
        problemaDesde: l.problema_desde,
      }));
    },

    async gravarProblemaDaFonte(estado) {
      const { error } = await cliente
        .from("estado_fontes")
        .update({
          em_problema: estado.emProblema,
          tipo_problema: estado.tipoProblema,
          problema_desde: estado.problemaDesde,
        })
        .eq("fonte", estado.fonte);
      checar(error, "gravar problema da fonte");
    },

    async marcarSucesso(fonte, em) {
      const { error } = await cliente.from("estado_fontes").update({ ultima_ok_em: em }).eq("fonte", fonte);
      checar(error, "marcar sucesso");
    },

    async atualizarUltimaEdicaoFim() {
      const { data, error } = await cliente
        .from("edicoes_lpc")
        .select("periodo_fim")
        .eq("status", "concluida")
        .order("periodo_fim", { ascending: false })
        .limit(1)
        .maybeSingle();
      checar(error, "ler última edição concluída");
      const fim = (data as { periodo_fim: string } | null)?.periodo_fim ?? null;
      const resposta = await cliente.from("estado_fontes").update({ ultima_edicao_fim: fim }).eq("fonte", "precos");
      checar(resposta.error, "gravar ultima_edicao_fim");
    },

    async ultimaExecucao(fonte) {
      const { data, error } = await cliente
        .from("execucoes_sync")
        .select("resultado")
        .eq("fonte", fonte)
        .order("iniciada_em", { ascending: false })
        .limit(1)
        .maybeSingle();
      checar(error, "ler última execução");
      return (data as { resultado: "ok" | "falha" } | null)?.resultado ?? null;
    },

    async registrarExecucao(e) {
      const { error } = await cliente.from("execucoes_sync").insert({
        fonte: e.fonte,
        iniciada_em: e.iniciadaEm,
        terminada_em: e.terminadaEm,
        resultado: e.resultado,
        detalhe: e.detalhe,
        contagens: e.contagens,
      });
      checar(error, "registrar execução");
    },

    async urlsVistas() {
      const linhas = await lerTudo<{ url: string }>(
        (de, ate) => cliente.from("links_lpc").select("url").order("url").range(de, ate),
        "ler links_lpc",
      );
      return new Set(linhas.map((l) => l.url));
    },

    async buscarEdicao(periodo) {
      const { data, error } = await cliente
        .from("edicoes_lpc")
        .select("id, status")
        .eq("periodo_inicio", periodo.inicio)
        .eq("periodo_fim", periodo.fim)
        .maybeSingle();
      checar(error, "buscar edição");
      return (data as EdicaoRegistrada | null) ?? null;
    },

    async criarEdicao({ periodo, url, sha256 }) {
      const { data, error } = await cliente
        .from("edicoes_lpc")
        .upsert(
          { periodo_inicio: periodo.inicio, periodo_fim: periodo.fim, url, sha256, status: "em_andamento" },
          { onConflict: "periodo_inicio,periodo_fim", ignoreDuplicates: true },
        )
        .select("id, status");
      checar(error, "criar edição");
      return ((data ?? []) as EdicaoRegistrada[])[0] ?? null;
    },

    async registrarEdicaoForaDaJanela({ periodo, url, sha256, contagens, em }) {
      const { data, error } = await cliente
        .from("edicoes_lpc")
        .upsert(
          {
            periodo_inicio: periodo.inicio,
            periodo_fim: periodo.fim,
            url,
            sha256,
            status: "fora_da_janela",
            processada_em: em,
            contagens,
          },
          { onConflict: "periodo_inicio,periodo_fim" },
        )
        .select("id")
        .single();
      checar(error, "registrar edição fora da janela");
      return (data as { id: number }).id;
    },

    async concluirEdicao(id, contagens, em) {
      const { error } = await cliente
        .from("edicoes_lpc")
        .update({ status: "concluida", processada_em: em, contagens })
        .eq("id", id);
      checar(error, "concluir edição");
    },

    async registrarLink(url, edicaoId, resultado, em) {
      const { error } = await cliente
        .from("links_lpc")
        .upsert({ url, edicao_id: edicaoId, resultado, visto_em: em }, { onConflict: "url" });
      checar(error, "registrar link");
    },

    async coletasExistentes(cnpjs, periodo) {
      const coletas: ColetaExistente[] = [];
      for (const lote of emLotes(cnpjs, 200)) {
        const { data, error } = await cliente
          .from("precos")
          .select("cnpj, data_coleta, preco")
          .eq("produto", PRODUTO)
          .in("cnpj", lote)
          .gte("data_coleta", periodo.inicio)
          .lte("data_coleta", periodo.fim);
        checar(error, "ler coletas existentes");
        for (const l of (data ?? []) as { cnpj: string; data_coleta: string; preco: number | string }[]) {
          const preco = canonicalizarPreco(String(l.preco));
          if (!preco.ok) throw new Error(`banco: preço gravado fora do formato: ${l.cnpj} ${l.data_coleta}`);
          coletas.push({ cnpj: l.cnpj, dataColeta: l.data_coleta, precoMilesimos: preco.milesimos });
        }
      }
      return coletas;
    },

    async cnpjsCadastrados(cnpjs) {
      const encontrados = new Set<string>();
      for (const lote of emLotes(cnpjs, 200)) {
        const { data, error } = await cliente.from("postos").select("cnpj").in("cnpj", lote);
        checar(error, "ler CNPJs cadastrados");
        for (const l of (data ?? []) as { cnpj: string }[]) encontrados.add(l.cnpj);
      }
      return encontrados;
    },

    async gravarPrecos(coletas) {
      let gravadas = 0;
      for (const lote of emLotes(coletas, LOTE)) {
        const { data, error } = await cliente
          .from("precos")
          .upsert(
            lote.map((c) => ({
              cnpj: c.cnpj,
              produto: PRODUTO,
              data_coleta: c.dataColeta,
              preco: c.preco,
              fonte: c.fonte,
              edicao_id: c.edicaoId,
            })),
            { onConflict: "cnpj,produto,data_coleta", ignoreDuplicates: true },
          )
          .select("cnpj");
        checar(error, "gravar preços");
        gravadas += (data ?? []).length;
      }
      return gravadas;
    },

    async lerPostos() {
      const linhas = await lerTudo<LinhaPosto>(
        (de, ate) =>
          cliente
            .from("postos")
            .select(
              "cnpj, razao_social, bandeira, endereco, bairro, cep, municipio, uf, lat, lng, acuracia_estimada, origem_localizacao, ativo",
            )
            .order("cnpj")
            .range(de, ate),
        "ler postos",
      );
      return linhas.map((l) => ({
        cnpj: l.cnpj,
        razaoSocial: l.razao_social,
        bandeira: l.bandeira,
        endereco: l.endereco,
        bairro: l.bairro,
        cep: l.cep,
        municipio: l.municipio,
        uf: l.uf,
        localizacao: l.lat !== null && l.lng !== null ? { lat: l.lat, lng: l.lng } : null,
        acuraciaEstimada: l.acuracia_estimada,
        origemLocalizacao: l.origem_localizacao,
        ativo: l.ativo,
      }));
    },

    async gravarPostos(postos, em) {
      for (const lote of emLotes(postos, LOTE)) {
        const { error } = await cliente.from("postos").upsert(
          lote.map((p) => ({
            cnpj: p.cnpj,
            razao_social: p.razaoSocial,
            bandeira: p.bandeira,
            endereco: p.endereco,
            bairro: p.bairro,
            cep: p.cep,
            municipio: p.municipio,
            uf: p.uf,
            localizacao: p.localizacao ? `SRID=4326;POINT(${p.localizacao.lng} ${p.localizacao.lat})` : null,
            acuracia_estimada: p.acuraciaEstimada,
            origem_localizacao: p.origemLocalizacao,
            ativo: true,
            desativado_em: null,
            atualizado_em: em,
          })),
          { onConflict: "cnpj" },
        );
        checar(error, "gravar postos");
      }
    },

    async desativarPostos(cnpjs, em) {
      for (const lote of emLotes(cnpjs, 200)) {
        const { error } = await cliente
          .from("postos")
          .update({ ativo: false, desativado_em: em, atualizado_em: em })
          .in("cnpj", lote);
        checar(error, "desativar postos");
      }
    },
  };
}
