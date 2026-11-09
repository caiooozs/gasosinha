"use client";

import { useRef } from "react";
import { BOTAO_CONTORNO } from "@/components/estados/EstadoGasosinha";
import type { ItemHistoricoVM } from "@/features/postos/domain/detalhe";
import type { MostrarMaisVM } from "@/features/postos/viewmodels/tipos";

/**
 * Histórico de coletas (FR-014), da mais recente para a mais antiga. Fica abaixo do gráfico das
 * coletas mais recentes (R14, revista em 2026-11-09) e é a alternativa a ele. Recebe só as coletas
 * da página visível; o "Mostrar mais" traz as próximas (D2), e todas continuam acessíveis.
 */
export function HistoricoPrecos({ itens, mostrarMais }: { itens: ItemHistoricoVM[]; mostrarMais?: MostrarMaisVM | null }) {
  const listaRef = useRef<HTMLOListElement>(null);

  // O foco vai para a primeira coleta nova, para quem usa teclado ou leitor de tela continuar dali.
  const aoMostrarMais = (acao: MostrarMaisVM) => {
    const jaVisiveis = listaRef.current?.children.length ?? 0;
    acao.onMostrarMais();
    requestAnimationFrame(() => (listaRef.current?.children[jaVisiveis] as HTMLElement | undefined)?.focus());
  };

  return (
    <>
      <ol ref={listaRef} aria-label="Todas as coletas" className="flex flex-col">
        {itens.map((item, indice) => (
          <li
            key={`${item.data}-${indice}`}
            tabIndex={-1}
            className="flex items-baseline justify-between border-b border-line py-2.5 text-base tabular-nums outline-none last:border-b-0 first:font-semibold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
          >
            <span className="text-ink-2 first:text-ink">{item.data}</span>
            <span className="text-ink">{item.preco}</span>
          </li>
        ))}
      </ol>
      {mostrarMais && (
        <button type="button" onClick={() => aoMostrarMais(mostrarMais)} className={BOTAO_CONTORNO}>
          {mostrarMais.texto}
        </button>
      )}
    </>
  );
}
