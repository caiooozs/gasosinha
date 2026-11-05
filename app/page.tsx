import { Suspense } from "react";
import { TelaMapa } from "@/components/mapa/TelaMapa";
import { hojeParaRender } from "@/features/postos/viewmodels/hoje.server";

/**
 * "/": mapa da RMR, lista da área visível, busca e localização (US1). Só compõe a tela; os dados
 * vêm dos viewmodels. A composição cliente fica atrás de <Suspense>, porque as consultas do
 * TanStack ativas no primeiro render leem a hora atual.
 */
export default async function Inicio() {
  const hoje = await hojeParaRender();
  return (
    <Suspense
      fallback={
        <p role="status" className="m-auto text-sm text-muted-foreground">
          Carregando postos…
        </p>
      }
    >
      <TelaMapa hoje={hoje} />
    </Suspense>
  );
}
