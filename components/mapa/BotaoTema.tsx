"use client";

import { cn } from "cn";
import { IconeLua, IconeSol } from "@/components/marca/Icones";
import { useTema } from "@/features/tema/viewmodels/useTema";

export type BotaoTemaProps = {
  /** "redondo": acima do botão de localização (celular). "quadrado": de vidro, ao lado dele (computador). */
  variante?: "redondo" | "quadrado";
};

/**
 * Troca entre o tema claro e o escuro. Mostra a lua no claro e o sol no escuro; o nome acessível
 * diz o que o toque faz.
 */
export function BotaoTema({ variante = "quadrado" }: BotaoTemaProps) {
  const { tema, alternar } = useTema();
  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={tema === "escuro" ? "Mudar para o tema claro" : "Mudar para o tema escuro"}
      className={cn(
        "flex cursor-pointer items-center justify-center text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        variante === "redondo"
          ? "size-12 rounded-full bg-float shadow-[0_0_0_1px_var(--pin-ring),0_6px_16px_#1C19171F]"
          : "glass size-11 rounded-[12px]",
      )}
    >
      {/* Os ícones seguem a classe `dark` do <html>, então já chegam certos antes da hidratação. */}
      <IconeLua className="size-5 dark:hidden" />
      <IconeSol className="hidden size-5 dark:block" />
    </button>
  );
}
