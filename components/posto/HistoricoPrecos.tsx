import type { ItemHistoricoVM } from "@/features/postos/domain/detalhe";

/**
 * Histórico de coletas (FR-014): a lista completa, da mais recente para a mais antiga. Fica abaixo
 * do gráfico das coletas mais recentes (R14, revista em 2026-11-09) e é a alternativa a ele.
 */
export function HistoricoPrecos({ itens }: { itens: ItemHistoricoVM[] }) {
  return (
    <ol className="flex flex-col">
      {itens.map((item, indice) => (
        <li
          key={`${item.data}-${indice}`}
          className="flex items-baseline justify-between border-b border-line py-2.5 text-base tabular-nums last:border-b-0 first:font-semibold"
        >
          <span className="text-ink-2 first:text-ink">{item.data}</span>
          <span className="text-ink">{item.preco}</span>
        </li>
      ))}
    </ol>
  );
}
