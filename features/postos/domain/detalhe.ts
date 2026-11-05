import { formatarData, formatarIdade, formatarPreco, formatarVariacao, type DataISO } from "@/lib/formato";
import { MUNICIPIOS_RMR } from "@/features/busca/data/municipios-rmr";
import { calcularIdade } from "./idade";
import { bandeiraParaExibir, siglaDaFonte } from "./rotulos";
import type { Coleta } from "./tipos";
import { calcularVariacao, direcaoDaVariacao, type DirecaoVariacao } from "./variacao";

/** O posto como vem do RPC `detalhe_posto`, já validado (contracts/supabase-rpc.md). */
export type DetalhePostoDados = {
  cnpj: string;
  nome: string;
  bandeira: string | null;
  endereco: string;
  bairro: string | null;
  /** Nome normalizado ("RECIFE"). */
  municipio: string;
  lat: number | null;
  lng: number | null;
  ativo: boolean;
  /** Todo o histórico de gasolina comum, da coleta mais recente para a mais antiga. */
  coletas: Coleta[];
};

export type ItemHistoricoVM = { data: string; preco: string };

/** O detalhe com os textos prontos para a view (FR-013 a FR-017). */
export type DetalheVM = {
  cnpj: string;
  nome: string;
  bandeira: string;
  /** "AVENIDA ..., 1142 · PRADO · Recife". */
  endereco: string;
  semPreco: boolean;
  precoAtual: string | null;
  dataAtual: string | null;
  /** "coletado há 5 semanas". */
  idadeTexto: string | null;
  idadeAntiga: boolean;
  fonte: string | null;
  variacaoTexto: string | null;
  direcaoVariacao: DirecaoVariacao | null;
  /** Só quando há exatamente uma coleta (FR-016). */
  semAnteriorTexto: string | null;
  historico: ItemHistoricoVM[];
  avisoInativo: string | null;
};

const SEM_ANTERIOR = "Ainda não há coleta anterior para comparar";
const AVISO_INATIVO = "Este posto não consta mais como autorizado pela ANP.";
const NOMES_MUNICIPIOS = new Map(MUNICIPIOS_RMR.map((m) => [m.nomeNormalizado, m.nome]));

function enderecoCompleto(dados: DetalhePostoDados): string {
  const municipio = NOMES_MUNICIPIOS.get(dados.municipio) ?? dados.municipio;
  return [dados.endereco, dados.bairro?.trim() || null, municipio].filter(Boolean).join(" · ");
}

/** Monta o detalhe do posto. O "hoje" (fuso de São Paulo) é parâmetro. */
export function montarDetalheVM(dados: DetalhePostoDados, hoje: DataISO): DetalheVM {
  const [atual, anterior] = dados.coletas;
  const comum = {
    cnpj: dados.cnpj,
    nome: dados.nome,
    bandeira: bandeiraParaExibir(dados.bandeira),
    endereco: enderecoCompleto(dados),
    avisoInativo: dados.ativo ? null : AVISO_INATIVO,
    historico: dados.coletas.map((c) => ({ data: formatarData(c.data), preco: formatarPreco(c.precoMilesimos) })),
  };

  if (!atual) {
    return {
      ...comum,
      semPreco: true,
      precoAtual: null,
      dataAtual: null,
      idadeTexto: null,
      idadeAntiga: false,
      fonte: null,
      variacaoTexto: null,
      direcaoVariacao: null,
      semAnteriorTexto: null,
    };
  }

  const idade = calcularIdade(atual.data, hoje);
  const variacao = calcularVariacao(atual, anterior);
  return {
    ...comum,
    semPreco: false,
    precoAtual: formatarPreco(atual.precoMilesimos),
    dataAtual: formatarData(atual.data),
    idadeTexto: `coletado ${formatarIdade(idade, false)}`,
    idadeAntiga: idade.antiga,
    fonte: atual.fonte,
    variacaoTexto: variacao ? formatarVariacao(variacao) : null,
    direcaoVariacao: variacao ? direcaoDaVariacao(variacao) : null,
    semAnteriorTexto: variacao ? null : SEM_ANTERIOR,
  };
}

/** Título e descrição da página do posto para os buscadores, com preço, data e fonte (Princípio I). */
export function montarMetadadosPosto(dados: DetalhePostoDados): { titulo: string; descricao: string } {
  const titulo = `${dados.nome} — Gasosinha`;
  const atual = dados.coletas[0];
  if (!atual) return { titulo, descricao: "Gasolina comum: sem preço" };
  return {
    titulo,
    descricao: `Gasolina comum ${formatarPreco(atual.precoMilesimos)}, coletado em ${formatarData(atual.data)} (${siglaDaFonte(atual.fonte)})`,
  };
}
