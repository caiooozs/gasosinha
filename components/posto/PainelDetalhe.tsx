"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useSyncExternalStore } from "react";
import { Drawer } from "vaul";
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

/** As alturas da folha do detalhe no celular, em fração da tela: metade e tela cheia (D9). */
const ALTURAS_FOLHA = [0.5, 1];

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

const ESTILO_FECHAR =
  "flex h-9 cursor-pointer items-center rounded-full bg-surface px-3.5 text-sm font-semibold text-ink hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

function BotaoFechar({ onFechar }: { onFechar: () => void }) {
  return (
    <button type="button" onClick={onFechar} className={ESTILO_FECHAR}>
      Fechar
    </button>
  );
}

/**
 * O único componente que chama os hooks do detalhe (contracts/ui.md): passa o `DetalheVM` e a
 * preferência por menos movimento ao `DetalhePosto`, que só renderiza. No modo página, o detalhe
 * fica na própria página, sem portal, para o nome e o preço estarem no HTML (FR-013). O `TelaMapa`
 * o põe no cartão à direita (D4), e "Fechar" é um link para `/`.
 */
export function PainelDetalhe({ modo, cnpj, hoje }: PainelDetalheProps) {
  const vm = useDetalhePosto(cnpj, hoje);
  const parado = usePrefereMenosMovimento();
  const historico = useHistoricoPaginado(cnpj, vm?.historico.length ?? 0);
  useMarcarDetalheAberto(modo === "modal");
  const router = useRouter();
  const computador = useComputador();
  const idTitulo = useId();
  // A altura da folha do detalhe no celular: começa na metade (D9).
  const [alturaFolha, setAlturaFolha] = useState<number | string>(ALTURAS_FOLHA[0]);

  const conteudo = vm ? (
    <DetalhePosto vm={vm} parado={parado} idTitulo={idTitulo} historico={historico} />
  ) : (
    <EstadoGasosinha pose="pensando" titulo="Posto não encontrado" texto="Confira o link ou volte ao mapa para escolher outro posto." />
  );

  if (modo === "pagina") {
    // Quem chegou pelo link pode não ter o site no histórico: "Fechar" leva ao mapa, com `replace`,
    // e nunca volta para fora do site (caso de borda "Fechar o detalhe aberto por link").
    return (
      <section aria-labelledby={vm ? idTitulo : undefined} className="flex flex-col">
        <div className="sticky top-0 z-10 flex justify-end bg-bg/95 px-3 pt-3 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none">
          <Link href="/" replace className={ESTILO_FECHAR}>
            Fechar
          </Link>
        </div>
        {conteudo}
      </section>
    );
  }

  // No celular, o detalhe é uma folha que abre na metade da tela (D9, decisão 4): o mapa acima fica
  // visível e usável, centralizado no posto, e a alça leva à tela cheia. Arrastar para baixo, Esc ou
  // "Fechar" voltam no histórico, como antes.
  if (!computador) {
    return (
      <Drawer.Root
        open
        onOpenChange={(aberto) => {
          if (!aberto) router.back();
        }}
        snapPoints={ALTURAS_FOLHA}
        activeSnapPoint={alturaFolha}
        setActiveSnapPoint={(ponto) => {
          if (ponto !== null) setAlturaFolha(ponto);
        }}
        modal={false}
        noBodyStyles
      >
        <Drawer.Portal>
          <Drawer.Content
            aria-describedby={undefined}
            className="fixed inset-x-0 bottom-0 z-50 flex h-full max-h-dvh flex-col rounded-t-[24px] bg-bg shadow-[0_-12px_32px_#1C19171A] outline-none"
          >
            <Drawer.Title className="sr-only">{vm?.nome ?? "Posto não encontrado"}</Drawer.Title>
            <div aria-hidden="true" className="mx-auto mt-2.5 h-1.5 w-11 shrink-0 rounded-full bg-line-strong" />
            <div className="rolagem-fina min-h-0 flex-1 overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]">
              <div className="sticky top-0 z-10 flex justify-end bg-bg/95 px-3 pt-1 backdrop-blur-sm">
                <BotaoFechar onFechar={() => router.back()} />
              </div>
              {conteudo}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  // No computador, o detalhe é um painel lateral não modal (D1): sem sobreposição nem trava de
  // rolagem, o mapa e a lista continuam usáveis com ele aberto, e clicar ou focar fora dele não o
  // fecha. Só "Fechar" e Esc fecham.
  const manterAberto = (evento: Event) => evento.preventDefault();

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
