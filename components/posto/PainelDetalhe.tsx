"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useSyncExternalStore } from "react";
import { EstadoGasosinha } from "@/components/estados/EstadoGasosinha";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { usePrefereMenosMovimento } from "@/features/gasosinha/viewmodels/usePrefereMenosMovimento";
import { useMarcarDetalheAberto } from "@/features/postos/viewmodels/useDetalheAberto";
import { useHistoricoPaginado } from "@/features/postos/viewmodels/useHistoricoPaginado";
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

function BotaoFechar({ onFechar }: { onFechar: () => void }) {
  return (
    <button
      type="button"
      onClick={onFechar}
      className="flex h-9 cursor-pointer items-center rounded-full bg-surface px-3.5 text-sm font-semibold text-ink hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      Fechar
    </button>
  );
}

const LINK_VOLTAR =
  "inline-flex w-max items-center gap-1 rounded-sm text-sm font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

/**
 * O único componente que chama os hooks do detalhe (contracts/ui.md): passa o `DetalheVM` e a
 * preferência por menos movimento ao `DetalhePosto`, que só renderiza. No modo página, o detalhe
 * fica na própria página, sem portal, para o nome e o preço estarem no HTML (FR-013), e "Voltar ao
 * mapa" leva para `/`.
 */
export function PainelDetalhe({ modo, cnpj, hoje }: PainelDetalheProps) {
  const vm = useDetalhePosto(cnpj, hoje);
  const parado = usePrefereMenosMovimento();
  const historico = useHistoricoPaginado(cnpj, vm?.historico.length ?? 0);
  useMarcarDetalheAberto(modo === "modal");
  const router = useRouter();
  const computador = useComputador();
  const idTitulo = useId();

  const conteudo = vm ? (
    <DetalhePosto vm={vm} parado={parado} idTitulo={idTitulo} historico={historico} />
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

  // No computador, o detalhe é um painel lateral não modal (D1): sem sobreposição nem trava de
  // rolagem, o mapa e a lista continuam usáveis com ele aberto, e clicar ou focar fora dele não o
  // fecha. Só "Fechar" e Esc fecham. No celular a folha cobre quase a tela toda e continua modal.
  const manterAberto = computador ? (evento: Event) => evento.preventDefault() : undefined;

  return (
    <Sheet
      open
      modal={!computador}
      onOpenChange={(aberto) => {
        if (!aberto) router.back();
      }}
    >
      <SheetContent
        side={computador ? "right" : "bottom"}
        showCloseButton={false}
        aria-describedby={undefined}
        onInteractOutside={manterAberto}
        onFocusOutside={manterAberto}
        className={
          computador
            ? // Cartão de vidro flutuante (336 px) à direita, com altura pelo conteúdo. O vidro fica num
              // filho, porque o Sheet anima a própria opacidade e isso apagaria o desfoque.
              "gap-0 border-0 bg-transparent p-0 shadow-none data-[side=right]:inset-y-auto data-[side=right]:top-4 data-[side=right]:right-4 data-[side=right]:h-auto data-[side=right]:w-[336px] data-[side=right]:border-l-0 data-[side=right]:sm:max-w-[336px]"
            : "max-h-[88dvh] gap-0 overflow-y-auto rounded-t-[24px] bg-bg p-0"
        }
      >
        <SheetTitle className="sr-only">{vm?.nome ?? "Posto não encontrado"}</SheetTitle>
        {computador ? (
          // O cartão corta nas pontas arredondadas, e quem rola é o filho: a barra de rolagem padrão
          // do Windows, no próprio cartão, deixava as pontas da direita retas.
          <div className="glass flex max-h-[calc(100dvh-32px)] flex-col overflow-hidden rounded-[18px]">
            <div className="rolagem-fina min-h-0 overflow-y-auto">
              <div className="sticky top-0 z-10 flex justify-end px-3 pt-3">
                <BotaoFechar onFechar={() => router.back()} />
              </div>
              {conteudo}
            </div>
          </div>
        ) : (
          <>
            <div className="sticky top-0 z-10 flex justify-end bg-bg/95 px-3 pt-3 backdrop-blur-sm">
              <BotaoFechar onFechar={() => router.back()} />
            </div>
            {conteudo}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
