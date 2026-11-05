"use client"; // Os limites de erro precisam ser Client Components.

import { useRouter } from "next/navigation";
import { BOTAO_CONTORNO, BOTAO_PRIMARIO, EstadoGasosinha } from "@/components/estados/EstadoGasosinha";

/** Erro dentro do modal do posto: fica no modal, sem derrubar o mapa por baixo. */
export default function ErroModalPosto({ retry }: { error: unknown; retry: () => void }) {
  const router = useRouter();
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Não foi possível carregar este posto"
      className="fixed inset-x-0 bottom-0 z-50 rounded-t-[24px] bg-white shadow-[0_-12px_32px_#1C19171A] md:inset-x-auto md:inset-y-0 md:right-0 md:w-[420px] md:rounded-none"
    >
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
            <button type="button" onClick={() => router.back()} className={BOTAO_CONTORNO}>
              Fechar
            </button>
          </div>
        }
      />
    </div>
  );
}
