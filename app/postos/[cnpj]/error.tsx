"use client"; // Os limites de erro precisam ser Client Components.

import Link from "next/link";
import { BOTAO_CONTORNO, BOTAO_PRIMARIO, EstadoGasosinha } from "@/components/estados/EstadoGasosinha";

/** Falha ao carregar o posto, com a opção de tentar de novo (casos de borda, "Falha ao carregar"). */
export default function ErroPosto({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="m-auto w-full max-w-sm">
      <EstadoGasosinha
        papel="alert"
        pose="pensando"
        titulo="Não foi possível carregar este posto."
        texto="Pode ser a conexão. Tente de novo em instantes."
        acao={
          <div className="flex w-full flex-col gap-2">
            <button type="button" onClick={() => retry()} className={BOTAO_PRIMARIO}>
              Tentar de novo
            </button>
            <Link href="/" className={BOTAO_CONTORNO}>
              Voltar ao mapa
            </Link>
          </div>
        }
      />
    </main>
  );
}
