import Link from "next/link";
import { Moeda } from "@/components/numeros/Moeda";
import type { ItemListaVM } from "@/features/postos/viewmodels/tipos";
import { SeloIdadeAntiga, SeloMaisBarato, SeloSemPreco, SeloVariacao } from "./Selos";

/**
 * Uma linha da lista (FR-010, FR-012), na forma da identidade visual: nome e bandeira à esquerda,
 * preço e fonte à direita. A linha inteira é um link para o detalhe do posto. Com o detalhe de
 * outro posto aberto, `substituirHistorico` troca o detalhe sem empilhar o histórico (D1).
 */
export function LinhaPosto({ item, substituirHistorico = false }: { item: ItemListaVM; substituirHistorico?: boolean }) {
  return (
    <Link
      href={`/postos/${item.cnpj}`}
      replace={substituirHistorico}
      data-cnpj={item.cnpj}
      className="flex items-center gap-3 border-b border-line px-5 py-3.5 transition-colors hover:bg-surface/70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink md:gap-2.5 md:px-4 md:py-2.5 md:hover:bg-glass-fill"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-base font-medium break-words text-ink md:text-sm">{item.nome}</span>
          {item.maisBarato && <SeloMaisBarato />}
        </span>

        {item.semPreco ? (
          <span className="text-sm text-ink-2">{item.bandeira} · sem coleta</span>
        ) : (
          <>
            <span className="text-sm text-ink-2">
              {item.bandeira} · <span className="sr-only">coletado em </span>
              {item.data}
              {!item.antiga && <> · {item.idade}</>}
            </span>
            <span className="flex flex-wrap items-center gap-1.5 pt-[3px]">
              {item.antiga && item.idade && <SeloIdadeAntiga idade={item.idade} />}
              {item.variacao && item.direcaoVariacao ? (
                <>
                  <SeloVariacao valor={item.variacao.valor} data={item.variacao.data} direcao={item.direcaoVariacao} />
                  <span className="sr-only">{item.variacao.acessivel}</span>
                </>
              ) : (
                <span className="text-xs text-ink-3">sem coleta anterior</span>
              )}
            </span>
          </>
        )}
      </span>

      <span className="flex w-24 shrink-0 flex-col items-end gap-0.5 md:w-[76px]">
        {item.semPreco ? (
          <SeloSemPreco />
        ) : (
          <>
            {item.preco && (
              <Moeda
                texto={item.preco}
                className="text-[20px] leading-6 font-semibold tracking-[-0.02em] text-ink md:text-[17px] md:leading-[22px]"
              />
            )}
            {/* "+0,40 · ANP": quanto custa a mais que o mais barato da área, e a fonte. */}
            <span aria-hidden="true" className="text-xs whitespace-nowrap text-ink-3 tabular-nums">
              {item.acimaDoMaisBarato && <>{item.acimaDoMaisBarato.curto} · </>}
              {item.fonteCurta}
            </span>
            {item.acimaDoMaisBarato && <span className="sr-only">{item.acimaDoMaisBarato.acessivel}. </span>}
            <span className="sr-only">Fonte: {item.fonte}</span>
          </>
        )}
      </span>
    </Link>
  );
}
