"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useSyncExternalStore } from "react";
import { EstadoGasosinha } from "@/components/estados/EstadoGasosinha";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useDetalhePosto } from "@/features/postos/viewmodels/useDetalhePosto";
import type { DataISO } from "@/lib/formato";
import { DetalhePosto } from "./DetalhePosto";

export type PainelDetalheProps = {
  /** "modal": sobre o mapa, ao navegar de dentro do site. "pagina": link direto, sem portal. */
  modo: "modal" | "pagina";
  cnpj: string;
  hoje: DataISO;
};

const CONSULTA_COMPUTADOR = "(min-width: 768px)";

function assinarLargura(avisar: () => void) {
  const consulta = window.matchMedia(CONSULTA_COMPUTADOR);
  consulta.addEventListener("change", avisar);
  return () => consulta.removeEventListener("change", avisar);
}

/** No computador o modal abre da direita; no celular, de baixo. */
function useComputador(): boolean {
  return useSyncExternalStore(
    assinarLargura,
    () => window.matchMedia(CONSULTA_COMPUTADOR).matches,
    () => true,
  );
}

const LINK_VOLTAR =
  "inline-flex w-max items-center gap-1 rounded-sm text-sm font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

/**
 * O único componente que chama os hooks do detalhe (contracts/ui.md): passa o `DetalheVM` ao
 * `DetalhePosto`, que só renderiza. No modo página, o detalhe fica na própria página, sem portal,
 * para o nome e o preço estarem no HTML (FR-013), e "Voltar ao mapa" leva para `/`.
 */
export function PainelDetalhe({ modo, cnpj, hoje }: PainelDetalheProps) {
  const vm = useDetalhePosto(cnpj, hoje);
  const router = useRouter();
  const computador = useComputador();
  const idTitulo = useId();

  const conteudo = vm ? (
    <DetalhePosto vm={vm} idTitulo={idTitulo} />
  ) : (
    <EstadoGasosinha pose="pensando" titulo="Posto não encontrado" texto="Confira o link ou volte ao mapa para escolher outro posto." />
  );

  if (modo === "pagina") {
    return (
      <section aria-labelledby={vm ? idTitulo : undefined} className="flex flex-col">
        <div className="px-5 pt-1">
          <Link href="/" className={LINK_VOLTAR}>
            Voltar ao mapa
          </Link>
        </div>
        {conteudo}
      </section>
    );
  }

  return (
    <Sheet
      open
      onOpenChange={(aberto) => {
        if (!aberto) router.back();
      }}
    >
      <SheetContent
        side={computador ? "right" : "bottom"}
        showCloseButton={false}
        aria-describedby={undefined}
        className={
          computador
            ? "w-full gap-0 overflow-y-auto bg-white p-0 sm:max-w-[420px]"
            : "max-h-[88dvh] gap-0 overflow-y-auto rounded-t-[24px] bg-white p-0"
        }
      >
        <SheetTitle className="sr-only">{vm?.nome ?? "Posto não encontrado"}</SheetTitle>
        <div className="sticky top-0 z-10 flex justify-end bg-white/95 px-3 pt-3 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 cursor-pointer items-center rounded-full bg-surface px-3.5 text-sm font-semibold text-ink hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Fechar
          </button>
        </div>
        {conteudo}
      </SheetContent>
    </Sheet>
  );
}
