import { cn } from "cn";
import { IconeIgual, IconeSetaBaixo, IconeSetaCima } from "@/components/marca/Icones";
import { PoseGasosinha, type NomePose } from "@/components/marca/Marca";
import type { Reacao } from "@/features/gasosinha/domain/reacao";

export type GasosinhaProps = {
  reacao: Reacao;
  /** "Subiu R$ 0,10 (+1,5%) desde 13/10/2026": diz tudo sozinho (FR-019). */
  texto: string;
  /** Menos movimento (FR-020): a mesma pose, sem o pulinho. */
  parado: boolean;
};

/**
 * Pose e balão de cada reação. As cores e os ícones são os do selo de variação (amarelo e seta
 * para cima se subiu, verde e seta para baixo se caiu), e o verbo no texto garante que a
 * informação não dependa da cor (Princípio VII).
 */
// O balão neutro tem um contorno fino: sem ele, o cinza claro some sobre o vidro quando o mapa atrás é claro.
const BALAO_NEUTRO = "bg-surface text-ink-2 shadow-[inset_0_0_0_1px_var(--color-line-strong)]";

const REACOES: Record<Reacao, { pose: NomePose; balao: string; Icone: typeof IconeSetaCima | null }> = {
  subiu: { pose: "surpreso", balao: "bg-yellow-soft text-yellow-ink", Icone: IconeSetaCima },
  caiu: { pose: "feliz", balao: "bg-green-soft text-green-ink", Icone: IconeSetaBaixo },
  estavel: { pose: "piscando", balao: BALAO_NEUTRO, Icone: IconeIgual },
  neutro: { pose: "pensando", balao: BALAO_NEUTRO, Icone: null },
};

/**
 * O Gasosinha reagindo à variação do preço (FR-018 a FR-020). A pose é decorativa (`alt=""`), e o
 * texto fica visível e em `aria-live`. Só renderiza o que recebe: a reação, o texto e o `parado`
 * vêm do viewmodel (Princípio IV).
 */
export function Gasosinha({ reacao, texto, parado }: GasosinhaProps) {
  const { pose, balao, Icone } = REACOES[reacao];
  return (
    <div className="flex items-center gap-3">
      <span
        data-parado={parado ? "true" : "false"}
        className={cn("block shrink-0", !parado && "animate-pulinho motion-reduce:animate-none")}
      >
        <PoseGasosinha pose={pose} className="size-[72px]" />
      </span>
      <p
        aria-live="polite"
        className={cn(
          // A ponta do balão é um quadrado girado da mesma cor, apontando para o mascote.
          "relative flex min-w-0 items-start gap-1.5 rounded-[14px] px-3 py-2 text-sm font-semibold tabular-nums",
          "before:absolute before:top-1/2 before:-left-1 before:size-2.5 before:-translate-y-1/2 before:rotate-45 before:bg-inherit before:content-['']",
          balao,
        )}
      >
        {Icone && <Icone className="mt-[3px] size-3 shrink-0" />}
        <span>{texto}</span>
      </p>
    </div>
  );
}
