import { cn } from "cn";
import type { ReactNode } from "react";
import { Logotipo } from "@/components/marca/Marca";

/**
 * Barra do app com o logotipo. No celular, mostra o produto ("Gasolina comum"); no painel do
 * computador, a região coberta e, em `acao`, o botão de recolher a lista (D6).
 */
export function BarraApp({ variante, className, acao }: { variante: "celular" | "painel"; className?: string; acao?: ReactNode }) {
  if (variante === "painel") {
    return (
      <div className={cn("flex items-center justify-between gap-2 px-4 pt-4 pb-3", className)}>
        <Logotipo className="text-lg" />
        <div className="flex items-center gap-1">
          <p className="text-xs leading-4 text-ink-2">Recife e região</p>
          {acao}
        </div>
      </div>
    );
  }
  return (
    <div className={cn("flex items-center justify-between bg-header px-4 pt-1 pb-3.5", className)}>
      <Logotipo />
      <p className="flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1.5 text-sm leading-4 font-medium text-ink">
        <span aria-hidden="true" className="size-2 rounded-[2px] border border-[#E5A900] bg-yellow" />
        Gasolina comum
      </p>
    </div>
  );
}
