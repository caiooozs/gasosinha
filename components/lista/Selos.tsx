/** Selos da identidade visual ("Selos de variação e idade"): sempre ícone ou forma, além da cor. */
import { cn } from "cn";
import { IconeIgual, IconeRelogio, IconeSemPreco, IconeSetaBaixo, IconeSetaCima } from "@/components/marca/Icones";
import type { DirecaoVariacao } from "@/features/postos/viewmodels/tipos";

const SELO = "inline-flex w-max items-center gap-1 rounded-full py-px pr-2 pl-1.5 text-xs leading-4 font-semibold";

/**
 * "Mais barato": pílula verde-clara com contorno leve (identidade visual). O texto basta para
 * identificar o posto; a cor só acompanha (Princípio VII).
 */
export function SeloMaisBarato() {
  return (
    <span className="inline-flex h-5 w-max items-center rounded-full bg-green-soft px-2 text-[11.5px] leading-none font-semibold text-green-ink shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-green)_22%,transparent)] md:h-[18px] md:px-[7px] md:text-[11px]">
      Mais barato
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
