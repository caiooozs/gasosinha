/**
 * Schemas Zod das fontes externas (T027), conforme specs/001-gas-price-map/contracts/fontes-externas.md.
 *
 * Todo dado externo passa por aqui antes de ser gravado (Princípio I). Registro fora do formato é
 * rejeitado com um motivo, nunca corrigido por palpite.
 */
import { z } from "zod";
import { normalizarCnpj } from "./cnpj.ts";
import { dataBrParaIso, dentroDoPeriodo, serialExcelParaIso, type Periodo } from "./data-serial.ts";
import { canonicalizarPreco } from "./preco.ts";
import { dentroDaRmr, ehMunicipioRmr, normalizarNomeMunicipio } from "./regiao-rmr.ts";

// --- API Revendedores ---

export const EnvelopeRevendedores = z.object({
  succeeded: z.literal(true),
  data: z.array(z.unknown()).optional(),
  searchPageFilter: z.object({
    totalPagina: z.number().int().min(0),
    totalRegistro: z.number().int().min(0),
  }),
});

export type PostoNormalizado = {
  cnpj: string;
  razaoSocial: string;
  bandeira: string | null;
  endereco: string;
  bairro: string | null;
  cep: string | null;
  municipio: string;
  uf: string;
  localizacao: { lat: number; lng: number } | null;
  /** A coordenada faltou, não é número ou cai fora da RMR (R2). */
  localizacaoInvalida: boolean;
  acuraciaEstimada: string | null;
  origemLocalizacao: string | null;
};

const textoOpcional = z
  .string()
  .nullish()
  .transform((v) => (v ?? "").trim());
const ouNull = (texto: string) => (texto === "" ? null : texto);
const COORDENADA = /^-?\d+(?:\.\d+)?$/;
const CEP = /^\d{5}-?\d{3}$/;

function lerLocalizacao(latitude: string, longitude: string): PostoNormalizado["localizacao"] {
  if (!COORDENADA.test(latitude) || !COORDENADA.test(longitude)) return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  return dentroDaRmr(lat, lng) ? { lat, lng } : null;
}

/** Um registro da API: `ignorado` quando está fora da RMR; rejeitado (erro do Zod) quando inválido. */
export const RevendedorAnp = z
  .object({
    cnpj: z.string(),
    razaoSocial: z.string().trim().min(1),
    uf: z.string().trim(),
    municipio: z.string(),
    endereco: z.string(),
    complemento: textoOpcional,
    bairro: textoOpcional,
    cep: textoOpcional,
    distribuidora: textoOpcional,
    latitude: textoOpcional,
    longitude: textoOpcional,
    estimativaAcuracia: textoOpcional,
    origemInformacao: textoOpcional,
  })
  .transform((r, ctx): { tipo: "ignorado" } | { tipo: "valido"; posto: PostoNormalizado } => {
    if (r.uf !== "PE" || !ehMunicipioRmr(r.municipio)) return { tipo: "ignorado" };
    const cnpj = normalizarCnpj(r.cnpj);
    if (!cnpj) {
      ctx.addIssue({ code: "custom", message: "cnpj_invalido" });
      return z.NEVER;
    }
    const localizacao = lerLocalizacao(r.latitude, r.longitude);
    return {
      tipo: "valido",
      posto: {
        cnpj,
        razaoSocial: r.razaoSocial,
        bandeira: ouNull(r.distribuidora),
        endereco: [r.endereco.trim(), r.complemento].filter(Boolean).join(", ").replace(/\s+/g, " "),
        bairro: ouNull(r.bairro),
        cep: CEP.test(r.cep) ? r.cep.replace("-", "") : null,
        municipio: normalizarNomeMunicipio(r.municipio),
        uf: r.uf,
        localizacao,
        localizacaoInvalida: localizacao === null,
        acuraciaEstimada: ouNull(r.estimativaAcuracia),
        origemLocalizacao: ouNull(r.origemInformacao),
      },
    };
  });

// --- Arquivo semanal do LPC ---

export type LinhaLpcValida = {
  /** Posição (1-based) da linha na lista devolvida pelo lerPlanilha. */
  linha: number;
  cnpj: string;
  dataColeta: string;
  precoMilesimos: number;
  /** O preço com 3 casas, como será gravado em numeric(6,3). */
  preco: string;
  municipio: string;
};

export type MotivoRejeicaoLpc =
  | "cnpj_invalido"
  | "unidade_inesperada"
  | "preco_invalido"
  | "data_fora_do_periodo"
  | "conflito_mesma_data";

const celula = z.string().nullable();

/** Uma linha de gasolina comum da RMR, já filtrada. O período vem do próprio arquivo. */
export function criarSchemaLinhaLpc(periodo: Periodo) {
  return z
    .object({ cnpj: celula, municipio: celula, unidade: celula, preco: celula, data: celula })
    .transform((l, ctx): Omit<LinhaLpcValida, "linha"> => {
      const rejeitar = (motivo: MotivoRejeicaoLpc) => {
        ctx.addIssue({ code: "custom", message: motivo });
        return z.NEVER;
      };
      const cnpj = normalizarCnpj(l.cnpj ?? "");
      if (!cnpj) return rejeitar("cnpj_invalido");
      if ((l.unidade ?? "").trim() !== "R$ / litro") return rejeitar("unidade_inesperada");
      const preco = canonicalizarPreco(l.preco ?? "");
      if (!preco.ok) return rejeitar("preco_invalido");
      const textoData = (l.data ?? "").trim();
      const dataColeta = serialExcelParaIso(textoData) ?? dataBrParaIso(textoData);
      if (!dataColeta || !dentroDoPeriodo(dataColeta, periodo)) return rejeitar("data_fora_do_periodo");
      return {
        cnpj,
        dataColeta,
        precoMilesimos: preco.milesimos,
        preco: preco.valor,
        municipio: normalizarNomeMunicipio(l.municipio ?? ""),
      };
    });
}

/** O motivo da primeira rejeição registrada pelo schema, ou um motivo genérico. */
export function motivoDoErro(erro: z.ZodError, padrao: string): string {
  return erro.issues.find((i) => i.code === "custom")?.message ?? padrao;
}
