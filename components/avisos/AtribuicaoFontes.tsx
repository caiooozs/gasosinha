import { cn } from "cn";

export type AtribuicaoFontesProps = {
  /** "24/10/2026": última atualização bem-sucedida dos preços, quando conhecida. */
  atualizadoEm: string | null;
  /**
   * "texto": centralizado, no fim da lista. "pilula": sobre o mapa, no computador. "linha": curta,
   * colada na pílula do celular, sempre à vista (D9).
   */
  variante?: "texto" | "pilula" | "linha";
  className?: string;
};

const LINK = "underline-offset-2 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ink";

/**
 * Atribuição permanente das fontes na tela do mapa (FR-030): a dos preços (ANP) e a do mapa base
 * (OpenFreeMap, OpenMapTiles e OpenStreetMap), que substitui o controle de atribuição do MapLibre.
 */
export function AtribuicaoFontes({ atualizadoEm, variante = "texto", className }: AtribuicaoFontesProps) {
  const atualizacao = atualizadoEm ? ` · atualizado em ${atualizadoEm}` : "";
  const mapa = (
    <>
      Mapa:{" "}
      <a className={LINK} href="https://openfreemap.org" target="_blank" rel="noreferrer">
        OpenFreeMap
      </a>{" "}
      ©{" "}
      <a className={LINK} href="https://openmaptiles.org" target="_blank" rel="noreferrer">
        OpenMapTiles
      </a>{" "}
      ©{" "}
      <a className={LINK} href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
        OpenStreetMap
      </a>
    </>
  );

  if (variante === "linha") {
    // A fonte dos preços e os créditos do mapa, no menor espaço: o Princípio I pede a fonte numa
    // atribuição permanente na mesma tela dos marcadores, e o FR-030 pede a do mapa. Em 320 px pode
    // ocupar duas linhas; o texto completo fica no fim da lista.
    return (
      <p
        className={cn(
          "glass mx-auto w-max max-w-full rounded-full px-2.5 py-0.5 text-center text-[10.5px] leading-[14px] text-ink-2",
          className,
        )}
      >
        Preços: ANP · {mapa}
      </p>
    );
  }

  if (variante === "pilula") {
    return (
      <p className={cn("glass flex h-7 items-center rounded-[8px] px-2.5 text-xs text-ink-2", className)}>
        <span>
          Preços: ANP{atualizacao} · {mapa}
        </span>
      </p>
    );
  }
  return (
    <p className={cn("text-center text-xs text-ink-3", className)}>
      Preços: ANP · Levantamento de Preços de Combustíveis{atualizacao} · {mapa}
    </p>
  );
}
