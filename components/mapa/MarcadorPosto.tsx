import { cn } from "cn";
import { ClockIcon } from "lucide-react";
import type { MarcadorVM } from "@/features/postos/viewmodels/tipos";

export type MarcadorPostoProps = {
  vm: Pick<MarcadorVM, "rotulo" | "nomeAcessivel" | "antigo" | "semPreco">;
  onSelecionar: () => void;
};

/**
 * Marcador de posto no mapa (FR-007, FR-008, FR-029; R12). É um botão com nome acessível que traz a
 * data completa da coleta. "Sem preço" tem outra forma (pílula vazada, borda tracejada) e
 * "antigo" tem ícone de relógio, além da cor.
 */
export function MarcadorPosto({ vm, onSelecionar }: MarcadorPostoProps) {
  return (
    <button
      type="button"
      aria-label={vm.nomeAcessivel}
      data-variante={vm.semPreco ? "sem-preco" : "com-preco"}
      data-antigo={vm.antigo ? "true" : "false"}
      onClick={onSelecionar}
      className={cn(
        "inline-flex min-h-6 min-w-6 cursor-pointer items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs leading-5 tabular-nums shadow-sm transition-transform",
        "hover:scale-105 focus-visible:scale-105 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:scale-100",
        vm.semPreco
          ? "border border-dashed border-neutral-600 bg-white/95 font-medium text-neutral-700"
          : vm.antigo
            ? "border border-amber-800 bg-amber-100 font-semibold text-amber-950"
            : "border border-neutral-900 bg-neutral-900 font-semibold text-white",
      )}
    >
      {vm.antigo && <ClockIcon aria-hidden="true" className="size-3 shrink-0" />}
      <span>{vm.rotulo}</span>
    </button>
  );
}
