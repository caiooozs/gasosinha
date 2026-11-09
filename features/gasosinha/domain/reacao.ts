import type { PrecoDatado } from "@/features/postos/domain/tipos";
import type { Variacao } from "@/features/postos/domain/variacao";
import { formatarData, formatarPercentual, formatarPreco } from "@/lib/formato";

/** A reação do Gasosinha à variação desde a coleta anterior (FR-018). */
export type Reacao = "subiu" | "caiu" | "estavel" | "neutro";

const SEM_ANTERIOR = "Ainda não há coleta anterior para comparar";
const SEM_PRECO = "Sem preço coletado";

/**
 * Compara a coleta mais recente com a anterior, em milésimos. Sem uma das duas, não há o que
 * comparar, e a reação é neutra.
 */
export function classificarReacao(atual?: PrecoDatado, anterior?: PrecoDatado): Reacao {
  if (!atual || !anterior) return "neutro";
  if (atual.precoMilesimos > anterior.precoMilesimos) return "subiu";
  if (atual.precoMilesimos < anterior.precoMilesimos) return "caiu";
  return "estavel";
}

/**
 * O texto curto que acompanha a reação (FR-019): "Subiu R$ 0,10 (+1,5%) desde 13/10/2026". Ele diz
 * tudo sozinho, porque a pose é decorativa. Sem variação, nunca inventa uma comparação.
 */
export function textoReacao(reacao: Reacao, variacao: Variacao | null, temPreco: boolean): string {
  if (!variacao || reacao === "neutro") return temPreco ? SEM_ANTERIOR : SEM_PRECO;
  const desde = formatarData(variacao.desde);
  if (reacao === "estavel") return `Mesmo preço da coleta de ${desde}`;
  const verbo = reacao === "subiu" ? "Subiu" : "Caiu";
  const diferenca = formatarPreco(Math.abs(variacao.diferencaMilesimos));
  return `${verbo} ${diferenca} (${formatarPercentual(variacao.percentual)}) desde ${desde}`;
}
