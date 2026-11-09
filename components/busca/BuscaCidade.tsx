"use client";

import { Command } from "cmdk";
import { cn } from "cn";
import { useState } from "react";
import { IconeBusca } from "@/components/marca/Icones";
import { PoseGasosinha } from "@/components/marca/Marca";
import type { Limites } from "@/features/busca/data/municipios-rmr";
import { useBuscaCidade } from "@/features/busca/viewmodels/useBuscaCidade";

const ROTULO = "Buscar cidade da Região Metropolitana do Recife";

export type BuscaCidadeProps = {
  aoSelecionar: (limites: Limites) => void;
  /** "flutuante": branca, com sombra, sobre o mapa (celular). "painel": em superfície, no painel da lista. */
  variante?: "flutuante" | "painel";
};

/**
 * Busca de cidade da RMR (FR-006), na forma da identidade visual. O `cmdk` liga o campo a um rótulo
 * próprio, oculto, com o nome completo da busca; o texto de exemplo fica visível no campo.
 */
export function BuscaCidade({ aoSelecionar, variante = "painel" }: BuscaCidadeProps) {
  const { texto, setTexto, resultados, selecionar } = useBuscaCidade(aoSelecionar);
  const [aberta, setAberta] = useState(false);
  const mostrarResultados = aberta && texto.trim() !== "";

  return (
    <Command
      label={ROTULO}
      shouldFilter={false}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "Escape") setAberta(false);
      }}
    >
      <div
        className={cn(
          "flex h-12 items-center gap-2.5 rounded-[14px] px-3.5 focus-within:shadow-[inset_0_0_0_2px_var(--color-ink)]",
          variante === "flutuante"
            ? "bg-float shadow-[0_0_0_1px_var(--pin-ring),0_6px_16px_#1C19171A]"
            : "bg-surface md:h-10 md:rounded-[12px] md:bg-glass-fill",
        )}
      >
        <IconeBusca className="size-[18px] shrink-0 text-ink" />
        <Command.Input
          value={texto}
          onValueChange={(valor) => {
            setTexto(valor);
            setAberta(true);
          }}
          onFocus={() => setAberta(true)}
          onBlur={() => setAberta(false)}
          placeholder="Buscar cidade da região"
          className={cn(
            "min-w-0 flex-1 bg-transparent text-base leading-[18px] text-ink outline-none",
            // ink-3 sobre o branco dá 4,8:1; sobre a superfície, ink-2 mantém o AA.
            variante === "flutuante" ? "placeholder:text-ink-3" : "placeholder:text-ink-2",
          )}
        />
      </div>

      {mostrarResultados && (
        <Command.List
          // Evita que o clique num resultado tire o foco do campo e feche a lista antes da seleção.
          onMouseDown={(e) => e.preventDefault()}
          className="absolute top-full right-0 left-0 z-30 mt-2 max-h-80 overflow-y-auto rounded-[14px] bg-popover p-1.5 shadow-[0_0_0_1px_var(--pin-ring),0_12px_32px_#1C19171F]"
        >
          <Command.Empty className="flex items-center gap-3 px-2 py-2 text-left">
            <PoseGasosinha pose="pensando" className="size-14" />
            <span className="flex flex-col gap-0.5">
              <span className="font-serif text-lg font-semibold text-ink">Não achei “{texto.trim()}”</span>
              <span className="text-sm text-ink-2">
                A busca cobre só as cidades da Região Metropolitana do Recife. O mapa continua onde estava.
              </span>
            </span>
          </Command.Empty>
          {resultados.map((municipio) => (
            <Command.Item
              key={municipio.codigoIbge}
              value={municipio.codigoIbge}
              onSelect={() => {
                selecionar(municipio);
                setAberta(false);
              }}
              className="flex h-11 cursor-pointer items-center rounded-[10px] px-3 text-base text-ink data-[selected=true]:bg-surface"
            >
              {municipio.nome}
            </Command.Item>
          ))}
        </Command.List>
      )}
    </Command>
  );
}
