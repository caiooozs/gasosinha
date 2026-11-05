import type { DataISO } from "@/lib/formato";
import { calcularIdade } from "./idade";
import type { PostoNoMapa } from "./tipos";

export type GrupoLista = "recente" | "antiga" | "sem_preco";
export type SentidoPreco = "asc" | "desc";
export type PostoOrdenado = PostoNoMapa & { grupo: GrupoLista };

const ORDEM_GRUPO: Record<GrupoLista, number> = { recente: 0, antiga: 1, sem_preco: 2 };
const comparadorNome = new Intl.Collator("pt-BR", { sensitivity: "base" });

function grupoDe(posto: PostoNoMapa, hoje: DataISO): GrupoLista {
  if (!posto.coletaAtual) return "sem_preco";
  return calcularIdade(posto.coletaAtual.data, hoje).antiga ? "antiga" : "recente";
}

/**
 * Ordem da lista (FR-011): três grupos fixos (recentes, antigas, sem preço). Dentro dos grupos
 * com preço, ordena por preço no sentido pedido; o empate e o grupo "sem preço" vão pelo nome.
 * Inverter o sentido não muda a ordem dos grupos.
 */
export function ordenarLista(postos: readonly PostoNoMapa[], hoje: DataISO, sentido: SentidoPreco): PostoOrdenado[] {
  const fator = sentido === "asc" ? 1 : -1;
  return postos
    .map((posto) => ({ ...posto, grupo: grupoDe(posto, hoje) }))
    .sort((a, b) => {
      const porGrupo = ORDEM_GRUPO[a.grupo] - ORDEM_GRUPO[b.grupo];
      if (porGrupo !== 0) return porGrupo;
      if (a.coletaAtual && b.coletaAtual) {
        const porPreco = (a.coletaAtual.precoMilesimos - b.coletaAtual.precoMilesimos) * fator;
        if (porPreco !== 0) return porPreco;
      }
      return comparadorNome.compare(a.nome, b.nome) || a.cnpj.localeCompare(b.cnpj);
    });
}
