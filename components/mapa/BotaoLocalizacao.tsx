"use client";

import { cn } from "cn";
import { useState } from "react";
import { IconeLocalizacao } from "@/components/marca/Icones";
import { useLocalizacao, type ResultadoLocalizacao } from "@/features/localizacao/viewmodels/useLocalizacao";

const MENSAGENS: Record<ResultadoLocalizacao, string | null> = {
  centralizado: null,
  negado: "Localização não permitida. O mapa continua na região padrão.",
  indisponivel: "Não foi possível obter sua localização.",
  fora_da_regiao: "Você está fora da área coberta",
};

export type BotaoLocalizacaoProps = {
  aoCentralizar: (lng: number, lat: number) => void;
  /** "redondo": só o ícone, no canto do mapa (celular). "pilula": ícone e texto (computador). */
  variante?: "redondo" | "pilula";
};

/**
 * "Usar minha localização" (FR-003 a FR-005). Só pede permissão no clique, nunca ao montar. Guarda
 * apenas o resultado (para a mensagem), nunca a coordenada (Princípio III).
 */
export function BotaoLocalizacao({ aoCentralizar, variante = "pilula" }: BotaoLocalizacaoProps) {
  const { pedir } = useLocalizacao(aoCentralizar);
  const [resultado, setResultado] = useState<ResultadoLocalizacao | null>(null);
  const [pedindo, setPedindo] = useState(false);

  async function aoClicar() {
    setPedindo(true);
    setResultado(null);
    try {
      setResultado(await pedir());
    } finally {
      setPedindo(false);
    }
  }

  const mensagem = resultado ? MENSAGENS[resultado] : null;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={aoClicar}
        disabled={pedindo}
        aria-label={variante === "redondo" ? "Usar minha localização" : undefined}
        className={cn(
          "flex cursor-pointer items-center justify-center text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-wait disabled:opacity-70",
          variante === "redondo"
            ? "size-12 rounded-full bg-float shadow-[0_0_0_1px_var(--pin-ring),0_6px_16px_#1C19171F]"
            : "glass h-11 gap-2 rounded-[12px] pr-4 pl-3 text-sm leading-4 font-semibold",
        )}
      >
        <IconeLocalizacao className={variante === "redondo" ? "size-[22px]" : "size-5"} />
        {variante === "pilula" && "Usar minha localização"}
      </button>
      {/* A região fica sempre no documento, para a mensagem ser anunciada quando aparecer. */}
      <p
        role="status"
        className={cn(
          mensagem
            ? "absolute bottom-full mb-2 w-max max-w-[260px] rounded-[10px] bg-ink px-3 py-2 text-sm text-bg shadow-[0_6px_16px_#1C19171F]"
            : "sr-only",
          variante === "redondo" ? "right-0" : "left-0",
        )}
      >
        {mensagem}
      </p>
    </div>
  );
}
