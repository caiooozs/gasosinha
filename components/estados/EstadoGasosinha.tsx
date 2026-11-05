import { cn } from "cn";
import type { ReactNode } from "react";
import { PoseGasosinha, type NomePose } from "@/components/marca/Marca";

export type EstadoGasosinhaProps = {
  pose: NomePose;
  titulo: string;
  texto?: string;
  /** "status" para carregando (anunciado sem interromper), "alert" para erro. */
  papel?: "status" | "alert";
  acao?: ReactNode;
  children?: ReactNode;
  className?: string;
};

/**
 * Estado da interface com o Gasosinha ("05 Estados com o Gasosinha"): a pose acompanha, e o texto
 * diz tudo sozinho.
 */
export function EstadoGasosinha({ pose, titulo, texto, papel, acao, children, className }: EstadoGasosinhaProps) {
  return (
    <div role={papel} className={cn("flex flex-col items-center gap-4 px-7 pt-8 pb-7 text-center", className)}>
      <PoseGasosinha pose={pose} className="h-[124px] w-[140px]" />
      <p className="font-serif text-xl font-semibold text-ink">{titulo}</p>
      {texto && <p className="max-w-[34ch] text-base text-ink-2">{texto}</p>}
      {acao}
      {children}
    </div>
  );
}

/** Botão escuro de ação principal ("Usar minha localização", "Tentar de novo"). */
export const BOTAO_PRIMARIO =
  "inline-flex h-[46px] w-full cursor-pointer items-center justify-center rounded-full bg-ink px-5 text-base leading-[18px] font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

/** Botão de contorno ("Ver a região inteira", "Ver lista"). */
export const BOTAO_CONTORNO =
  "inline-flex h-[46px] w-full cursor-pointer items-center justify-center rounded-full border border-line-strong bg-white px-5 text-base leading-[18px] font-semibold text-ink transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
