import { HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { PainelDetalhe } from "@/components/posto/PainelDetalhe";
import { montarEstadoDetalhe } from "@/features/postos/viewmodels/detalhe-posto.server";
import { hojeParaRender } from "@/features/postos/viewmodels/hoje.server";

/**
 * Detalhe do posto como modal sobre o mapa, ao navegar de dentro do site (rota interceptada). O
 * mapa e a lista continuam por baixo; fechar volta no histórico. Quem abre o link direto recebe
 * a página completa (`app/postos/[cnpj]/page.tsx`).
 */
export default function ModalPosto({ params }: { params: Promise<{ cnpj: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center rounded-t-[24px] bg-white px-5 py-6 shadow-[0_-12px_32px_#1C19171A] md:inset-x-auto md:inset-y-0 md:right-0 md:w-[420px] md:items-center md:rounded-none">
          <p role="status" className="text-sm text-ink-2">
            Carregando posto…
          </p>
        </div>
      }
    >
      {params.then(({ cnpj }) => (
        <ConteudoModal cnpj={cnpj} />
      ))}
    </Suspense>
  );
}

async function ConteudoModal({ cnpj }: { cnpj: string }) {
  const [{ estado }, hoje] = await Promise.all([montarEstadoDetalhe(cnpj), hojeParaRender()]);
  // Posto inexistente: o próprio painel mostra "Posto não encontrado" dentro do modal.
  return (
    <HydrationBoundary state={estado}>
      <PainelDetalhe modo="modal" cnpj={cnpj} hoje={hoje} />
    </HydrationBoundary>
  );
}
