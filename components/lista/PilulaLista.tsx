import type { Ref } from "react";
import { IconeBusca, IconeLista, IconeRecolher } from "@/components/marca/Icones";
import { Logotipo } from "@/components/marca/Marca";
import type { EstadoCarga } from "@/features/postos/viewmodels/tipos";

const BOTAO_REDONDO =
  "grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-ink hover:bg-glass-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export type PilulaListaProps = {
  /** "360 postos nesta área": o mesmo título da lista, sempre o total da área. */
  titulo: string;
  /** O `id` da lista que a pílula abre. */
  controla: string;
  onExpandir: () => void;
  /** Abre a lista com o foco na busca de cidade. */
  onBuscar: () => void;
  expandirRef?: Ref<HTMLButtonElement>;
};

/**
 * A lista recolhida, no computador (D6): uma pílula de vidro no canto do mapa, com a contagem da
 * área, a ação de abrir a lista e a busca de cidade, que continua alcançável. Só renderiza o que
 * recebe.
 */
export function PilulaLista({ titulo, controla, onExpandir, onBuscar, expandirRef }: PilulaListaProps) {
  return (
    <div className="glass flex h-12 items-center gap-1 rounded-full py-1.5 pr-1.5 pl-4">
      <Logotipo className="text-base" />
      <span aria-hidden="true" className="mx-2 h-5 w-px bg-line-strong" />
      <button
        ref={expandirRef}
        type="button"
        onClick={onExpandir}
        aria-expanded={false}
        aria-controls={controla}
        className="flex h-9 cursor-pointer items-center gap-2 rounded-full px-3 text-sm font-semibold whitespace-nowrap text-ink hover:bg-glass-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <IconeLista className="size-4" />
        {titulo} · Ver lista
      </button>
      <button type="button" onClick={onBuscar} aria-label="Buscar cidade da região" title="Buscar cidade da região" className={BOTAO_REDONDO}>
        <IconeBusca className="size-4" />
      </button>
    </div>
  );
}

export type PilulaCelularProps = {
  /** "8 postos": a contagem curta da área visível, que cabe em 320 px. */
  titulo: string;
  estado: EstadoCarga;
  vazia: boolean;
  /** A folha da lista está aberta (`aria-expanded`). */
  aberta: boolean;
  /** O `id` da folha da lista. */
  controla: string;
  onAbrir: () => void;
  onBuscar: () => void;
  onTentarDeNovo: () => void;
  onVerRegiaoInteira: () => void;
  abrirRef?: Ref<HTMLButtonElement>;
};

const ACAO_TEXTO =
  "flex h-9 shrink-0 cursor-pointer items-center rounded-full px-3 text-sm font-semibold whitespace-nowrap text-ink underline-offset-2 hover:bg-glass-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

/**
 * A barra compacta do celular (D9): a única coisa fixa sobre o mapa, embaixo. Mostra a contagem da
 * área e abre a lista; a busca fica ao lado. Os estados que antes ficavam na folha de resumo
 * (carregando, vazio e erro) aparecem nela, com a mesma ação. Só renderiza o que recebe.
 */
export function PilulaCelular({
  titulo,
  estado,
  vazia,
  aberta,
  controla,
  onAbrir,
  onBuscar,
  onTentarDeNovo,
  onVerRegiaoInteira,
  abrirRef,
}: PilulaCelularProps) {
  let conteudo;
  if (estado === "carregando" && vazia) {
    conteudo = (
      <p role="status" className="truncate px-3 text-sm font-medium text-ink-2">
        Buscando os preços…
      </p>
    );
  } else if (estado === "erro" && vazia) {
    conteudo = (
      <>
        <p role="alert" className="truncate pl-3 text-sm font-medium text-ink">
          Não deu para carregar
        </p>
        <button type="button" onClick={onTentarDeNovo} className={ACAO_TEXTO}>
          Tentar de novo
        </button>
      </>
    );
  } else if (vazia) {
    conteudo = (
      <>
        <p className="truncate pl-3 text-sm font-medium text-ink">Nenhum posto aqui</p>
        <button type="button" onClick={onVerRegiaoInteira} className={ACAO_TEXTO}>
          Ver a região inteira
        </button>
      </>
    );
  } else {
    conteudo = (
      <button
        ref={abrirRef}
        type="button"
        onClick={onAbrir}
        aria-expanded={aberta}
        aria-controls={controla}
        className="flex h-9 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-full px-3 text-sm font-semibold whitespace-nowrap text-ink hover:bg-glass-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <IconeLista className="size-4 shrink-0" />
        <span className="truncate">{titulo} · Ver lista</span>
      </button>
    );
  }

  return (
    <div className="glass flex h-12 w-full items-center gap-1 rounded-full py-1.5 pr-1.5 pl-1.5">
      <div className="flex min-w-0 flex-1 items-center justify-between gap-1">{conteudo}</div>
      <span aria-hidden="true" className="h-5 w-px shrink-0 bg-line-strong" />
      <button type="button" onClick={onBuscar} aria-label="Buscar cidade da região" title="Buscar cidade da região" className={BOTAO_REDONDO}>
        <IconeBusca className="size-4" />
      </button>
    </div>
  );
}

/** O botão no cabeçalho do cartão da lista que a recolhe na pílula (D6). */
export function BotaoRecolherLista({ controla, onRecolher }: { controla: string; onRecolher: () => void }) {
  return (
    <button
      type="button"
      onClick={onRecolher}
      aria-label="Recolher lista"
      title="Recolher lista"
      aria-expanded={true}
      aria-controls={controla}
      className={BOTAO_REDONDO}
    >
      <IconeRecolher className="size-4" />
    </button>
  );
}
