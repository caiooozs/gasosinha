import { cn } from "cn";
import type { VariacaoColetaVM } from "@/features/postos/domain/detalhe";

const COR: Record<VariacaoColetaVM["direcao"], string> = {
  subiu: "font-semibold text-yellow-ink",
  caiu: "font-semibold text-green-ink",
  igual: "font-medium text-ink-2",
};

/**
 * A variação de cada coleta para a anterior, numa grade de rótulos pequenos e valores com sinal
 * (padrão do seuimposto). O sinal diz a direção mesmo sem a cor (Princípio VII).
 */
export function GradeVariacoes({ itens }: { itens: VariacaoColetaVM[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs leading-4 text-ink-2">Variação a cada coleta, em R$</p>
      <dl className="grid grid-cols-5 gap-1">
        {itens.map((item) => (
          <div key={item.data} className="flex flex-col gap-px">
            <dt className="text-[10px] leading-3 text-[var(--chart-axis)] tabular-nums">{item.data}</dt>
            <dd className={cn("text-[13px] leading-4 tabular-nums", COR[item.direcao])}>{item.texto}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
