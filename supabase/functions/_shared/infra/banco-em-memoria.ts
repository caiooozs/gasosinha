/**
 * Banco em memória, só para os testes da orquestração. Reproduz as regras que importam do banco
 * real: as chaves únicas (período da edição, posto + produto + data do preço, URL do link) e o
 * `on conflict do nothing` dos preços.
 */
import type { EstadoFonte, Fonte } from "../alerta.ts";
import type { Periodo } from "../data-serial.ts";
import type { ColetaExistente, StatusEdicao } from "../lote-precos.ts";
import { canonicalizarPreco } from "../preco.ts";
import type { PostoGravado } from "../retrato-postos.ts";
import type { PostoNormalizado } from "../schemas.ts";
import type { BancoGasosinha, Execucao, NovaColeta, ResultadoLink } from "./banco.ts";

const paraGravado = (p: PostoNormalizado): PostoGravado => ({
  cnpj: p.cnpj,
  razaoSocial: p.razaoSocial,
  bandeira: p.bandeira,
  endereco: p.endereco,
  bairro: p.bairro,
  cep: p.cep,
  municipio: p.municipio,
  uf: p.uf,
  localizacao: p.localizacao,
  acuraciaEstimada: p.acuraciaEstimada,
  origemLocalizacao: p.origemLocalizacao,
  ativo: true,
});

export type EdicaoEmMemoria = {
  id: number;
  periodo: Periodo;
  url: string;
  sha256: string;
  status: StatusEdicao;
  processadaEm: string | null;
  contagens: Record<string, unknown> | null;
};

export type ColetaEmMemoria = NovaColeta;

export function criarBancoEmMemoria() {
  const estado: Record<Fonte, EstadoFonte> = {
    cadastro: { fonte: "cadastro", ultimaOkEm: null, ultimaEdicaoFim: null, emProblema: false, tipoProblema: null, problemaDesde: null },
    precos: { fonte: "precos", ultimaOkEm: null, ultimaEdicaoFim: null, emProblema: false, tipoProblema: null, problemaDesde: null },
  };
  const dados = {
    estado,
    execucoes: [] as Execucao[],
    edicoes: [] as EdicaoEmMemoria[],
    links: new Map<string, { edicaoId: number; resultado: ResultadoLink }>(),
    precos: [] as ColetaEmMemoria[],
    postos: new Map<string, { posto: PostoGravado; atualizadoEm: string; desativadoEm: string | null }>(),
    /** Quantas vezes cada operação de escrita foi chamada, para conferir que nada foi escrito à toa. */
    escritas: { gravarPostos: 0, desativarPostos: 0 },
    /** Para simular duas execuções criando a mesma edição ao mesmo tempo. */
    antesDeCriarEdicao: null as null | ((periodo: Periodo) => void),
  };
  let proximoId = 1;
  const mesmoPeriodo = (a: Periodo, b: Periodo) => a.inicio === b.inicio && a.fim === b.fim;

  const banco: BancoGasosinha = {
    async lerEstadoFontes() {
      return Object.values(dados.estado).map((e) => ({ ...e }));
    },
    async gravarProblemaDaFonte(e) {
      Object.assign(dados.estado[e.fonte], {
        emProblema: e.emProblema,
        tipoProblema: e.tipoProblema,
        problemaDesde: e.problemaDesde,
      });
    },
    async marcarSucesso(fonte, em) {
      dados.estado[fonte].ultimaOkEm = em;
    },
    async atualizarUltimaEdicaoFim() {
      const fins = dados.edicoes.filter((e) => e.status === "concluida").map((e) => e.periodo.fim).sort();
      dados.estado.precos.ultimaEdicaoFim = fins.at(-1) ?? null;
    },
    async ultimaExecucao(fonte) {
      const daFonte = dados.execucoes.filter((e) => e.fonte === fonte);
      return daFonte.at(-1)?.resultado ?? null;
    },
    async registrarExecucao(e) {
      dados.execucoes.push(e);
    },

    async urlsVistas() {
      return new Set(dados.links.keys());
    },
    async buscarEdicao(periodo) {
      const e = dados.edicoes.find((x) => mesmoPeriodo(x.periodo, periodo));
      return e ? { id: e.id, status: e.status } : null;
    },
    async criarEdicao({ periodo, url, sha256 }) {
      dados.antesDeCriarEdicao?.(periodo);
      if (dados.edicoes.some((x) => mesmoPeriodo(x.periodo, periodo))) return null;
      const e: EdicaoEmMemoria = { id: proximoId++, periodo, url, sha256, status: "em_andamento", processadaEm: null, contagens: null };
      dados.edicoes.push(e);
      return { id: e.id, status: e.status };
    },
    async registrarEdicaoForaDaJanela({ periodo, url, sha256, contagens, em }) {
      let e = dados.edicoes.find((x) => mesmoPeriodo(x.periodo, periodo));
      if (!e) {
        e = { id: proximoId++, periodo, url, sha256, status: "fora_da_janela", processadaEm: em, contagens };
        dados.edicoes.push(e);
      } else {
        Object.assign(e, { url, sha256, status: "fora_da_janela", processadaEm: em, contagens });
      }
      return e.id;
    },
    async concluirEdicao(id, contagens, em) {
      const e = dados.edicoes.find((x) => x.id === id);
      if (!e) throw new Error(`edição ${id} não existe`);
      Object.assign(e, { status: "concluida", processadaEm: em, contagens });
    },
    async registrarLink(url, edicaoId, resultado) {
      dados.links.set(url, { edicaoId, resultado });
    },
    async coletasExistentes(cnpjs, periodo): Promise<ColetaExistente[]> {
      const alvo = new Set(cnpjs);
      return dados.precos
        .filter((p) => alvo.has(p.cnpj) && p.dataColeta >= periodo.inicio && p.dataColeta <= periodo.fim)
        .map((p) => {
          const preco = canonicalizarPreco(p.preco);
          if (!preco.ok) throw new Error(`preço gravado fora do formato: ${p.preco}`);
          return { cnpj: p.cnpj, dataColeta: p.dataColeta, precoMilesimos: preco.milesimos };
        });
    },
    async cnpjsCadastrados(cnpjs) {
      return new Set(cnpjs.filter((c) => dados.postos.has(c)));
    },
    async gravarPrecos(coletas) {
      let gravadas = 0;
      for (const c of coletas) {
        if (dados.precos.some((p) => p.cnpj === c.cnpj && p.dataColeta === c.dataColeta)) continue;
        dados.precos.push(c);
        gravadas++;
      }
      return gravadas;
    },

    async lerPostos() {
      return [...dados.postos.values()].map((r) => ({ ...r.posto }));
    },
    async gravarPostos(postos, em) {
      dados.escritas.gravarPostos += postos.length;
      for (const p of postos) dados.postos.set(p.cnpj, { posto: paraGravado(p), atualizadoEm: em, desativadoEm: null });
    },
    async desativarPostos(cnpjs, em) {
      dados.escritas.desativarPostos += cnpjs.length;
      for (const c of cnpjs) {
        const r = dados.postos.get(c);
        if (r) Object.assign(r, { posto: { ...r.posto, ativo: false }, desativadoEm: em, atualizadoEm: em });
      }
    },
  };
  return { banco, dados };
}
