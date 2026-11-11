"use client";

import type { ReactNode } from "react";
import { Drawer } from "vaul";
import type { AlturaFolha } from "@/features/postos/viewmodels/useFolhaLista";

/** As duas alturas da folha, em fração da tela: na metade, o mapa continua à vista em cima. */
const PONTOS = [0.5, 1];
const PONTO_DA_ALTURA: Record<Exclude<AlturaFolha, "fechada">, number> = { meia: 0.5, cheia: 1 };

export type FolhaListaProps = {
  /** O `id` que a pílula usa no `aria-controls`. */
  id: string;
  altura: AlturaFolha;
  onMudarAltura: (altura: Exclude<AlturaFolha, "fechada">) => void;
  onFechar: () => void;
  /** O logotipo e o botão de tema, no topo da folha (decisão 3 do T132). */
  cabecalho: ReactNode;
  children: ReactNode;
};

export const BOTAO_FECHAR_FOLHA =
  "flex h-9 shrink-0 cursor-pointer items-center rounded-full bg-surface px-3.5 text-sm font-semibold text-ink hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

/**
 * A lista dos postos no celular (D9): uma folha que sobe de baixo, com duas alturas. Na metade, o
 * mapa acima continua visível e usável (não modal, sem sobreposição) e a lista acompanha a área
 * visível; arrastando a alça, ela vai para a tela cheia ou fecha. Não usa o histórico. Só renderiza
 * o que recebe.
 */
export function FolhaLista({ id, altura, onMudarAltura, onFechar, cabecalho, children }: FolhaListaProps) {
  const aberta = altura !== "fechada";
  return (
    <Drawer.Root
      open={aberta}
      onOpenChange={(abrir) => {
        if (!abrir) onFechar();
      }}
      snapPoints={PONTOS}
      activeSnapPoint={aberta ? PONTO_DA_ALTURA[altura] : PONTOS[0]}
      setActiveSnapPoint={(ponto) => {
        if (ponto === 1) onMudarAltura("cheia");
        else if (ponto === 0.5) onMudarAltura("meia");
      }}
      modal={false}
      noBodyStyles
    >
      <Drawer.Portal>
        <Drawer.Content
          id={id}
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-40 flex h-full max-h-dvh flex-col rounded-t-[24px] bg-bg shadow-[0_-12px_32px_#1C19171A] outline-none md:hidden"
        >
          <Drawer.Title className="sr-only">Postos da área visível</Drawer.Title>
          {/* A alça: arrastar para cima leva à tela cheia; para baixo, fecha. */}
          <div aria-hidden="true" className="mx-auto mt-2.5 h-1.5 w-11 shrink-0 rounded-full bg-line-strong" />
          <div className="flex shrink-0 items-center justify-between gap-2 px-4 pt-2 pb-1">
            {cabecalho}
            <button type="button" onClick={onFechar} aria-label="Fechar lista" className={BOTAO_FECHAR_FOLHA}>
              Fechar
            </button>
          </div>
          <div className="rolagem-fina min-h-0 flex-1 overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
