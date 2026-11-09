import {
  formatarData,
  formatarDataCurta,
  formatarDiferencaCurta,
  formatarIdade,
  formatarPercentual,
  formatarPreco,
  separarMoeda,
  type DataISO,
} from "@/lib/formato";
import { MUNICIPIOS_RMR } from "@/features/busca/data/municipios-rmr";
import { classificarReacao, textoReacao, type Reacao } from "@/features/gasosinha/domain/reacao";
import { montarGrafico, variacoesEntreColetas } from "./historico";
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

/** O gráfico em degraus do histórico, com posições de 0 a 1 e os rótulos prontos. */
export type GraficoHistoricoVM = {
  /** Da coleta mais antiga para a mais recente; `y` maior é preço maior. */
  pontos: { x: number; y: number }[];
  /** Marcas do eixo de preço: "6,50". */
  rotulosY: { texto: string; y: number }[];
  /** Altura da coleta anterior, desenhada como linha tracejada. */
  referenciaY: number;
  /** "15/09" e "20/10": as datas das pontas. */
  inicio: string;
  fim: string;
  /** O gráfico em uma frase, para leitores de tela. */
  descricao: string;
};

/** A variação de uma coleta para a anterior: "+0,08" em 22/09. */
export type VariacaoColetaVM = { data: string; texto: string; direcao: DirecaoVariacao };

// Quantas coletas o gráfico mostra e quantas variações a grade mostra (a lista traz todas).
const PONTOS_NO_GRAFICO = 8;
const VARIACOES_NA_GRADE = 5;

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
  /** "+1,5%": o percentual em destaque ao lado do preço (o texto completo fica em `textoReacao`). */
  variacaoPercentual: string | null;
  direcaoVariacao: DirecaoVariacao | null;
  /** A reação do Gasosinha (FR-018). */
  reacao: Reacao;
  /**
   * O que o Gasosinha diz (FR-019): a variação em R$ e em % com a data da coleta anterior (FR-015),
   * "Ainda não há coleta anterior para comparar" com uma coleta só (FR-016) ou "Sem preço coletado".
   */
  textoReacao: string;
  historico: ItemHistoricoVM[];
  /** Com duas coletas ou mais. */
  grafico: GraficoHistoricoVM | null;
  variacoesColetas: VariacaoColetaVM[];
  avisoInativo: string | null;
};

const AVISO_INATIVO = "Este posto não consta mais como autorizado pela ANP.";
const NOMES_MUNICIPIOS = new Map(MUNICIPIOS_RMR.map((m) => [m.nomeNormalizado, m.nome]));

function enderecoCompleto(dados: DetalhePostoDados): string {
  const municipio = NOMES_MUNICIPIOS.get(dados.municipio) ?? dados.municipio;
  return [dados.endereco, dados.bairro?.trim() || null, municipio].filter(Boolean).join(" · ");
}

function montarGraficoVM(dados: DetalhePostoDados): GraficoHistoricoVM | null {
  const grafico = montarGrafico(dados.coletas, PONTOS_NO_GRAFICO);
  if (!grafico) return null;
  const { pontos } = grafico;
  const valores = pontos.map((p) => `${formatarDataCurta(p.data)}, ${formatarPreco(p.precoMilesimos)}`).join("; ");
  return {
    pontos: pontos.map(({ x, y }) => ({ x, y })),
    rotulosY: grafico.marcas.map((m) => ({ texto: separarMoeda(formatarPreco(m.precoMilesimos)).valor, y: m.y })),
    referenciaY: grafico.referencia.y,
    inicio: formatarDataCurta(pontos[0].data),
    fim: formatarDataCurta(pontos[pontos.length - 1].data),
    descricao: `Preço por coleta: ${valores}. A linha tracejada marca a coleta anterior.`,
  };
}

function montarVariacoesColetas(dados: DetalhePostoDados): VariacaoColetaVM[] {
  return variacoesEntreColetas(dados.coletas, VARIACOES_NA_GRADE).map((v) => ({
    data: formatarDataCurta(v.data),
    texto: formatarDiferencaCurta(v.diferencaMilesimos),
    direcao: v.diferencaMilesimos > 0 ? "subiu" : v.diferencaMilesimos < 0 ? "caiu" : "igual",
  }));
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
    grafico: montarGraficoVM(dados),
    variacoesColetas: montarVariacoesColetas(dados),
  };

  const reacao = classificarReacao(atual, anterior);

  if (!atual) {
    return {
      ...comum,
      semPreco: true,
      precoAtual: null,
      dataAtual: null,
      idadeTexto: null,
      idadeAntiga: false,
      fonte: null,
      variacaoPercentual: null,
      direcaoVariacao: null,
      reacao,
      textoReacao: textoReacao(reacao, null, false),
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
    variacaoPercentual: variacao ? formatarPercentual(variacao.percentual) : null,
    direcaoVariacao: variacao ? direcaoDaVariacao(variacao) : null,
    reacao,
    textoReacao: textoReacao(reacao, variacao, true),
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
