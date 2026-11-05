import type { DataISO } from "@/lib/formato";
import { calcularIdade } from "./idade";
import type { PostoNoMapa } from "./tipos";

/**
 * Os postos com o menor preço da área entre as coletas recentes (até 28 dias): o selo "mais
 * barato" e o marcador verde da identidade visual. Coleta antiga não concorre (FR-011). Com menos
 * de duas coletas recentes, ou com todas no mesmo preço, não há com quem comparar e ninguém é
 * marcado. O preço é comparado em milésimos inteiros.
 */
export function cnpjsMaisBaratos(postos: readonly PostoNoMapa[], hoje: DataISO): ReadonlySet<string> {
  const recentes = postos.filter(
    (p): p is PostoNoMapa & { coletaAtual: NonNullable<PostoNoMapa["coletaAtual"]> } =>
      p.coletaAtual !== undefined && !calcularIdade(p.coletaAtual.data, hoje).antiga,
  );
  if (recentes.length < 2) return new Set();
  const precos = recentes.map((p) => p.coletaAtual.precoMilesimos);
  const menor = Math.min(...precos);
  if (precos.every((preco) => preco === menor)) return new Set();
  return new Set(recentes.filter((p) => p.coletaAtual.precoMilesimos === menor).map((p) => p.cnpj));
}
