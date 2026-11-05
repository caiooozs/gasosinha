"use client"; // Os limites de erro precisam ser Client Components.

import { BOTAO_PRIMARIO, EstadoGasosinha } from "@/components/estados/EstadoGasosinha";

/** Erro inesperado ao abrir o mapa, com a opção de tentar de novo (casos de borda, "Falha ao carregar"). */
export default function Erro({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="m-auto w-full max-w-sm">
      <EstadoGasosinha
        papel="alert"
        pose="pensando"
        titulo="Não foi possível abrir o mapa."
        texto="Pode ser a conexão. Tente de novo em instantes."
        acao={
          <button type="button" onClick={() => retry()} className={BOTAO_PRIMARIO}>
            Tentar de novo
          </button>
        }
      />
    </main>
  );
}
