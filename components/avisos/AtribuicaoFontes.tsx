import { cn } from "cn";

export type AtribuicaoFontesProps = {
  /** "24/10/2026": última atualização bem-sucedida dos preços, quando conhecida. */
  atualizadoEm: string | null;
  /** "texto": centralizado, na folha do celular e no fim da lista. "pilula": sobre o mapa, no computador. */
  variante?: "texto" | "pilula";
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

  if (variante === "pilula") {
    return (
      <p className={cn("flex h-7 items-center rounded-[8px] bg-white/90 px-2.5 text-xs text-ink-2", className)}>
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
