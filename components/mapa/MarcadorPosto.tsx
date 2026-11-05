import { cn } from "cn";
import { IconeRelogio, IconeSemPreco, IconeSetaBaixo } from "@/components/marca/Icones";
import type { MarcadorVM } from "@/features/postos/viewmodels/tipos";

export type MarcadorPostoProps = {
  vm: Pick<MarcadorVM, "cnpj" | "preco" | "idade" | "nomeAcessivel" | "antigo" | "semPreco" | "maisBarato">;
  onSelecionar: () => void;
};

const FOCO =
  "cursor-pointer rounded-[16px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink transition-transform hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0";

/**
 * Marcador de posto no mapa (FR-007, FR-008, FR-029; R12), na forma da identidade visual: pílula
 * com o preço e a idade, e uma ponta para o local. É um botão com nome acessível que traz a data
 * completa. Cada estado tem uma pista além da cor:
 * - "sem preço": pílula tracejada, com um círculo vazio e sem ponta;
 * - "antigo": fundo amarelo-claro com relógio;
 * - "mais barato": verde, com seta para baixo.
 */
export function MarcadorPosto({ vm, onSelecionar }: MarcadorPostoProps) {
  const comum = {
    type: "button" as const,
    "aria-label": vm.nomeAcessivel,
    // Identifica a origem do detalhe, para o foco voltar aqui quando ele fechar.
    "data-cnpj": vm.cnpj,
    "data-antigo": vm.antigo ? "true" : "false",
    "data-mais-barato": vm.maisBarato ? "true" : "false",
    onClick: onSelecionar,
  };

  if (vm.semPreco || vm.preco === null) {
    return (
      <button {...comum} data-variante="sem-preco" className={FOCO}>
        <span className="flex items-center gap-1 rounded-full border border-dashed border-line-dashed bg-surface px-[9px] py-[5px] text-xs font-medium text-ink-2 shadow-[0_1px_2px_#1C19170F]">
          <IconeSemPreco className="size-2.5 text-ink-3" />
          sem preço
        </span>
      </button>
    );
  }

  const variante = vm.maisBarato ? "mais-barato" : vm.antigo ? "antigo" : "padrao";
  return (
    <button {...comum} data-variante="com-preco" className={cn(FOCO, "flex flex-col items-center")}>
      <span
        className={cn(
          "flex items-center gap-[5px] rounded-full py-1.5 whitespace-nowrap tabular-nums",
          variante === "mais-barato" && "bg-green pr-2.5 pl-2 text-white shadow-[0_2px_6px_#0F7A4440]",
          variante === "antigo" && "bg-yellow-soft pr-2.5 pl-2 text-ink shadow-[0_0_0_1px_#F2D675,0_2px_6px_#1C19171A]",
          variante === "padrao" && "bg-white px-2.5 text-ink shadow-[0_0_0_1px_#1C19171A,0_2px_6px_#1C19171A]",
        )}
      >
        {vm.maisBarato && <IconeSetaBaixo className="size-3.5" />}
        {vm.antigo && <IconeRelogio className="size-3 text-yellow-ink" />}
        <span className="text-sm leading-4 font-semibold tracking-[-0.01em]">{vm.preco}</span>
        <span
          className={cn(
            "text-[11px] leading-[14px] font-medium",
            variante === "mais-barato" ? "text-white" : variante === "antigo" ? "text-yellow-ink" : "text-ink-3",
          )}
        >
          {vm.idade}
        </span>
      </span>
      <svg
        aria-hidden="true"
        width="12"
        height="6"
        viewBox="0 0 12 6"
        className={cn(
          "-mt-px shrink-0",
          variante === "mais-barato" ? "text-green" : variante === "antigo" ? "text-yellow-soft" : "text-white",
        )}
      >
        <path d="M0 0h12L6 6z" fill="currentColor" />
      </svg>
    </button>
  );
}
