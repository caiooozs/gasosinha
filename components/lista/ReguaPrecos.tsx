import { cn } from "cn";
import { Moeda } from "@/components/numeros/Moeda";
import type { ReguaVM } from "@/features/postos/viewmodels/tipos";

/**
 * Régua de preços da área (identidade visual, padrão do seuimposto): a diferença entre o mais
 * barato e o mais caro em destaque, e um ponto por posto entre os dois. Leitores de tela recebem a
 * régua inteira numa frase só (`descricao`). Só renderiza o que recebe.
 */
export function ReguaPrecos({ regua }: { regua: ReguaVM }) {
  return (
    <div role="img" aria-label={regua.descricao} className="flex flex-col gap-2 px-1">
      <p className="flex items-baseline gap-2">
        <Moeda
          texto={regua.diferenca}
          className="shrink-0 font-serif text-[26px] leading-none font-light tracking-[-0.04em] text-ink"
        />
        <span className="text-xs leading-4 text-ink-2">
          de diferença entre o mais barato e o mais caro daqui <b className="font-semibold text-ink">({regua.percentual})</b>
        </span>
      </p>
      <div className="relative mx-[7px] h-1.5 rounded-full bg-line-strong">
        {regua.pontos.map((ponto) => (
          <span
            key={ponto.cnpj}
            className={cn(
              "absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-bg",
              ponto.maisBarato ? "bg-green" : "bg-ink-3",
            )}
            style={{ left: `${ponto.posicao * 100}%` }}
          />
        ))}
      </div>
      <p className="flex justify-between text-[11px] leading-4 text-ink-2">
        <span>
          <b className="font-semibold text-green-ink tabular-nums">{regua.menor}</b> mais barato
        </span>
        <span>
          mais caro <b className="font-semibold text-ink tabular-nums">{regua.maior}</b>
        </span>
      </p>
    </div>
  );
}
