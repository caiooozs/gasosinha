/**
 * Montagem dos textos prontos que as views recebem (contracts/ui.md). Funções puras: o "hoje" é
 * sempre parâmetro.
 */
import {
  formatarData,
  formatarDiferencaCurta,
  formatarIdade,
  formatarPercentualSemSinal,
  formatarPreco,
  formatarVariacao,
  formatarVariacaoCurta,
  type DataISO,
} from "@/lib/formato";
import type { ItemAgrupado } from "../domain/agrupar";
import { calcularIdade } from "../domain/idade";
import { cnpjsMaisBaratos } from "../domain/mais-barato";
import { ordenarLista, type GrupoLista, type PostoOrdenado, type SentidoPreco } from "../domain/ordenar-lista";
import { acimaDoMenor, calcularRegua, type Regua } from "../domain/regua";
import { bandeiraParaExibir, nomeAcessivelMarcador, partesRotuloMarcador, siglaDaFonte } from "../domain/rotulos";
import type { PostoNoMapa } from "../domain/tipos";
import { calcularVariacao, direcaoDaVariacao } from "../domain/variacao";
import type { GrupoListaVM, GrupoVM, ItemListaVM, MarcadorVM, ReguaVM } from "./tipos";

export const TITULOS_GRUPO: Record<GrupoLista, string> = {
  recente: "Coletas recentes",
  antiga: "Coletas antigas (mais de 4 semanas)",
  sem_preco: "Sem preço",
};

/** "1 posto nesta área", "8 postos nesta área". */
export function tituloContagem(quantidade: number): string {
  return `${tituloContagemCurto(quantidade)} nesta área`;
}

/** "1 posto", "8 postos": para a pílula do celular, que precisa caber em 320 px (D9). */
export function tituloContagemCurto(quantidade: number): string {
  return `${quantidade} ${quantidade === 1 ? "posto" : "postos"}`;
}


function montarItemLista(
  posto: PostoOrdenado,
  hoje: DataISO,
  maisBaratos: ReadonlySet<string>,
  regua: Regua | null,
): ItemListaVM {
  const comum = { cnpj: posto.cnpj, nome: posto.nome, bandeira: bandeiraParaExibir(posto.bandeira) };
  const coleta = posto.coletaAtual;
  if (!coleta) {
    return { ...comum, semPreco: true, antiga: false, variacao: null, direcaoVariacao: null, maisBarato: false, acimaDoMaisBarato: null };
  }

  const idade = calcularIdade(coleta.data, hoje);
  const variacao = calcularVariacao(coleta, posto.coletaAnterior);
  // Coleta antiga não concorre com as recentes (FR-011): fica sem a diferença.
  const acima = idade.antiga ? null : acimaDoMenor(regua, coleta.precoMilesimos);
  return {
    ...comum,
    semPreco: false,
    preco: formatarPreco(coleta.precoMilesimos),
    data: formatarData(coleta.data),
    idade: formatarIdade(idade, false),
    antiga: idade.antiga,
    fonte: coleta.fonte,
    fonteCurta: siglaDaFonte(coleta.fonte),
    variacao: variacao
      ? { ...formatarVariacaoCurta(variacao, coleta.data), acessivel: `Variação: ${formatarVariacao(variacao)}` }
      : null,
    direcaoVariacao: variacao ? direcaoDaVariacao(variacao) : null,
    maisBarato: maisBaratos.has(posto.cnpj),
    acimaDoMaisBarato:
      acima === null
        ? null
        : { curto: formatarDiferencaCurta(acima), acessivel: `${formatarPreco(acima)} acima do mais barato da área` },
  };
}

/**
 * Os grupos da lista (FR-010, FR-011), na ordem fixa, sem os grupos vazios. O "mais barato" e a
 * diferença para ele são calculados entre os próprios postos recebidos (os da área visível).
 */
export function montarGruposLista(postos: readonly PostoNoMapa[], hoje: DataISO, sentido: SentidoPreco): GrupoListaVM[] {
  const maisBaratos = cnpjsMaisBaratos(postos, hoje);
  const regua = calcularRegua(postos, hoje);
  const grupos: GrupoListaVM[] = [];
  let grupoAtual: GrupoLista | null = null;
  for (const posto of ordenarLista(postos, hoje, sentido)) {
    if (posto.grupo !== grupoAtual) {
      grupoAtual = posto.grupo;
      grupos.push({ titulo: TITULOS_GRUPO[posto.grupo], itens: [] });
    }
    grupos[grupos.length - 1].itens.push(montarItemLista(posto, hoje, maisBaratos, regua));
  }
  return grupos;
}

/** A régua de preços da área visível, com os textos prontos; `null` quando não há o que comparar. */
export function montarRegua(postos: readonly PostoNoMapa[], hoje: DataISO): ReguaVM | null {
  const regua = calcularRegua(postos, hoje);
  if (!regua) return null;
  const diferenca = formatarPreco(regua.diferencaMilesimos);
  const percentual = formatarPercentualSemSinal(regua.percentual);
  const menor = formatarPreco(regua.menorMilesimos);
  const maior = formatarPreco(regua.maiorMilesimos);
  const maisBaratos = cnpjsMaisBaratos(postos, hoje);
  return {
    diferenca,
    percentual,
    menor,
    maior,
    pontos: regua.pontos.map((p) => ({ ...p, maisBarato: maisBaratos.has(p.cnpj) })),
    descricao: `Preços das coletas recentes da área: de ${menor} a ${maior}, diferença de ${diferenca} (${percentual}).`,
  };
}

/**
 * Marcadores individuais e grupos do mapa, com preço, idade e nome acessível prontos (FR-007 a
 * FR-009). O marcador do posto `selecionado` (o aberto no detalhe) fica destacado (D5).
 */
export function montarMarcadores(
  itens: readonly ItemAgrupado[],
  hoje: DataISO,
  maisBaratos: ReadonlySet<string>,
  selecionado: string | null = null,
): { marcadores: MarcadorVM[]; grupos: GrupoVM[] } {
  const marcadores: MarcadorVM[] = [];
  const grupos: GrupoVM[] = [];
  for (const item of itens) {
    if (item.tipo === "grupo") {
      grupos.push({ id: item.id, lng: item.lng, lat: item.lat, quantidade: item.quantidade, zoomExpansao: item.zoomExpansao });
      continue;
    }
    const { posto } = item;
    const partes = partesRotuloMarcador(posto, hoje);
    const maisBarato = maisBaratos.has(posto.cnpj);
    marcadores.push({
      cnpj: posto.cnpj,
      lng: posto.lng,
      lat: posto.lat,
      preco: partes?.preco ?? null,
      idade: partes?.idade ?? null,
      nomeAcessivel: nomeAcessivelMarcador(posto, { maisBarato, idadeCurta: partes?.idade }),
      antigo: posto.coletaAtual ? calcularIdade(posto.coletaAtual.data, hoje).antiga : false,
      semPreco: !posto.coletaAtual,
      maisBarato,
      selecionado: posto.cnpj === selecionado,
    });
  }
  return { marcadores, grupos };
}
