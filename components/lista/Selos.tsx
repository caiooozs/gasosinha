/** Selos da identidade visual ("Selos de variação e idade"): sempre ícone ou forma, além da cor. */
import { cn } from "cn";
import { IconeIgual, IconeRelogio, IconeSemPreco, IconeSetaBaixo, IconeSetaCima } from "@/components/marca/Icones";
import type { DirecaoVariacao } from "@/features/postos/viewmodels/tipos";

const SELO = "inline-flex w-max items-center gap-1 rounded-[4px] py-px pr-1.5 pl-[5px] text-xs leading-4 font-semibold";

export function SeloMaisBarato() {
  return (
    <span className="inline-flex w-max items-center gap-[3px] rounded-[4px] bg-green py-0.5 pr-1.5 pl-1 text-[11px] leading-[14px] font-semibold tracking-[0.02em] text-white uppercase">
      <IconeSetaBaixo className="size-[11px]" espessura={2.25} />
      mais barato
    </span>
  );
}

/** Coleta antiga (FR-029): relógio, contorno e o texto "coleta antiga" para leitores de tela. */
export function SeloIdadeAntiga({ idade }: { idade: string }) {
  return (
    <span className={cn(SELO, "border border-yellow-line bg-yellow-soft text-yellow-ink")}>
      <IconeRelogio className="size-3" />
      {idade}
      <span className="sr-only"> · coleta antiga</span>
    </span>
  );
}

const VARIACAO: Record<DirecaoVariacao, { classe: string; Icone: typeof IconeSetaCima }> = {
  subiu: { classe: "bg-yellow-soft text-yellow-ink", Icone: IconeSetaCima },
  caiu: { classe: "bg-green-soft text-green-ink", Icone: IconeSetaBaixo },
  igual: { classe: "bg-surface text-ink-2", Icone: IconeIgual },
};

/** Variação desde a coleta anterior (FR-010): amarelo e seta para cima se subiu; verde e seta para baixo se caiu. */
export function SeloVariacao({ texto, direcao }: { texto: string; direcao: DirecaoVariacao }) {
  const { classe, Icone } = VARIACAO[direcao];
  return (
    <span className={cn(SELO, "tabular-nums", classe)}>
      <Icone className="size-3" />
      {texto}
    </span>
  );
}

/** "sem preço" (FR-008): pílula tracejada com um círculo vazio. */
export function SeloSemPreco() {
  return (
    <span className="inline-flex w-max items-center gap-1 rounded-full border border-dashed border-line-dashed px-[9px] py-1 text-xs leading-4 font-medium text-ink-2">
      <IconeSemPreco className="size-2.5 text-ink-3" />
      sem preço
    </span>
  );
}
