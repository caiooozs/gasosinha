import { cn } from "cn";
import { IconeLocalizacao } from "@/components/marca/Icones";
import type { EstadoLocalizacao, ResultadoLocalizacao } from "@/features/localizacao/viewmodels/useAcompanharLocalizacao";

const MENSAGENS: Record<ResultadoLocalizacao, string | null> = {
  centralizado: null,
  negado: "Localização não permitida. O mapa continua na região padrão.",
  indisponivel: "Não foi possível obter sua localização.",
  fora_da_regiao: "Você está fora da área coberta",
};

export type BotaoLocalizacaoProps = {
  /** Vem do `useAcompanharLocalizacao`, chamado no `TelaMapa`: os dois botões (celular e computador) mostram o mesmo estado. */
  estado: Pick<EstadoLocalizacao, "seguindo" | "pedindo" | "resultado">;
  onUsar: () => void;
  /** "redondo": só o ícone, no canto do mapa (celular). "pilula": ícone e texto (computador). */
  variante?: "redondo" | "pilula";
};

/**
 * "Usar minha localização" (FR-003 a FR-005, D7). Só renderiza: o pedido, o acompanhamento e o
 * modo seguir ficam no viewmodel. É um botão de alternar: `aria-pressed` diz se o mapa está
 * seguindo a pessoa. Com o modo seguir ligado, ele fica escuro (contraste e `aria-pressed`, não só
 * cor). Nunca recebe a coordenada (Princípio III).
 */
export function BotaoLocalizacao({ estado, onUsar, variante = "pilula" }: BotaoLocalizacaoProps) {
  const { seguindo, pedindo, resultado } = estado;
  const mensagem = resultado ? MENSAGENS[resultado] : null;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onUsar}
        disabled={pedindo}
        aria-busy={pedindo}
        aria-pressed={seguindo}
        aria-label={variante === "redondo" ? "Usar minha localização" : undefined}
        className={cn(
          "flex cursor-pointer items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-wait disabled:opacity-70",
          variante === "redondo"
            ? "size-12 rounded-full shadow-[0_0_0_1px_var(--pin-ring),0_6px_16px_#1C19171F]"
            : "h-11 gap-2 rounded-[12px] pr-4 pl-3 text-sm leading-4 font-semibold",
          seguindo ? "bg-ink text-bg" : variante === "redondo" ? "bg-float text-ink" : "glass text-ink",
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
