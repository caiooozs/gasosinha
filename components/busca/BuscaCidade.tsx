"use client";

import { useState } from "react";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { Limites } from "@/features/busca/data/municipios-rmr";
import { useBuscaCidade } from "@/features/busca/viewmodels/useBuscaCidade";

const ROTULO = "Buscar cidade da Região Metropolitana do Recife";

/**
 * Busca de cidade da RMR (FR-006). O `cmdk` liga o campo ao próprio rótulo (oculto); o texto
 * visível é o mesmo, e por isso fica fora da árvore de acessibilidade para não ser lido duas vezes.
 */
export function BuscaCidade({ aoSelecionar }: { aoSelecionar: (limites: Limites) => void }) {
  const { texto, setTexto, resultados, selecionar } = useBuscaCidade(aoSelecionar);
  const [aberta, setAberta] = useState(false);
  const mostrarResultados = aberta && texto.trim() !== "";

  return (
    <div className="flex flex-col gap-1">
      <span aria-hidden="true" className="text-xs font-medium">
        {ROTULO}
      </span>
      <Command
        label={ROTULO}
        shouldFilter={false}
        className="relative overflow-visible bg-transparent p-0"
        onKeyDown={(e) => {
          if (e.key === "Escape") setAberta(false);
        }}
      >
        <CommandInput
          value={texto}
          onValueChange={(valor) => {
            setTexto(valor);
            setAberta(true);
          }}
          onFocus={() => setAberta(true)}
          onBlur={() => setAberta(false)}
          placeholder="Ex.: Olinda, Jaboatão"
        />
        {mostrarResultados && (
          <CommandList
            // Evita que o clique num resultado tire o foco do campo e feche a lista antes da seleção.
            onMouseDown={(e) => e.preventDefault()}
            className="absolute top-full right-1 left-1 z-30 mt-1 rounded-lg border bg-popover p-1 shadow-lg"
          >
            <CommandEmpty className="px-2 py-3 text-left text-sm">Cidade fora da RMR ou não encontrada</CommandEmpty>
            {resultados.map((municipio) => (
              <CommandItem
                key={municipio.codigoIbge}
                value={municipio.codigoIbge}
                onSelect={() => {
                  selecionar(municipio);
                  setAberta(false);
                }}
              >
                {municipio.nome}
              </CommandItem>
            ))}
          </CommandList>
        )}
      </Command>
    </div>
  );
}
