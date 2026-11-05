export type MarcadorGrupoProps = {
  quantidade: number;
  onAproximar: () => void;
};

/** Grupo de postos sobrepostos (FR-009): um botão "12 postos, aproximar" que mostra a quantidade. */
export function MarcadorGrupo({ quantidade, onAproximar }: MarcadorGrupoProps) {
  return (
    <button
      type="button"
      aria-label={`${quantidade} postos, aproximar`}
      onClick={onAproximar}
      className="grid size-10 cursor-pointer place-items-center rounded-full border-[3px] border-white bg-ink text-sm leading-4 font-semibold text-white tabular-nums shadow-[0_2px_8px_#1C191733] transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink motion-reduce:transition-none motion-reduce:hover:scale-100"
    >
      {quantidade}
    </button>
  );
}
