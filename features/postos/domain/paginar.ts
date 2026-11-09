/**
 * Paginação incremental ("Mostrar mais") da lista de postos e do histórico do detalhe (D2). Funções
 * puras: a quantidade visível vem do viewmodel.
 */

type Grupo<T> = { titulo: string; itens: readonly T[] };

/**
 * Os primeiros `quantidade` itens, na ordem dos grupos (recente, antiga, sem preço). Grupos que
 * ficam sem itens saem, para a lista não mostrar um título vazio. `restantes` é quantos faltam.
 */
export function paginarGrupos<G extends Grupo<unknown>>(grupos: readonly G[], quantidade: number): { grupos: G[]; restantes: number } {
  const visiveis: G[] = [];
  let sobra = quantidade;
  let total = 0;
  for (const grupo of grupos) {
    total += grupo.itens.length;
    if (sobra <= 0) continue;
    const itens = grupo.itens.slice(0, sobra);
    sobra -= itens.length;
    if (itens.length > 0) visiveis.push(itens.length === grupo.itens.length ? grupo : { ...grupo, itens });
  }
  return { grupos: visiveis, restantes: Math.max(0, total - quantidade) };
}

export type NomeItens = { singular: string; plural: string; feminino: boolean };

/**
 * O texto do botão: "Mostrar mais 20 (faltam 123)", "Mostrar os 5 postos restantes" ou "Mostrar o
 * último posto" ("as"/"a última" para coletas). Com mais de uma página, o nome dos itens sai para o
 * texto caber numa linha no cartão de 336 px; a lista logo acima já diz do que se trata.
 */
export function textoMostrarMais(restantes: number, passo: number, nome: NomeItens): string {
  if (restantes === 1) return `Mostrar ${nome.feminino ? "a última" : "o último"} ${nome.singular}`;
  if (restantes <= passo) return `Mostrar ${nome.feminino ? "as" : "os"} ${restantes} ${nome.plural} restantes`;
  return `Mostrar mais ${passo} (faltam ${restantes})`;
}
