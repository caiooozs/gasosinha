"use client"; // Os limites de erro precisam ser Client Components.

import { Button } from "@/components/ui/button";

/** Erro inesperado ao abrir o mapa, com a opção de tentar de novo (casos de borda, "Falha ao carregar"). */
export default function Erro({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="m-auto flex flex-col items-center gap-3 p-6 text-center">
      <h1 className="text-lg font-semibold">Não foi possível abrir o mapa.</h1>
      <Button type="button" onClick={() => retry()}>
        Tentar de novo
      </Button>
    </main>
  );
}
