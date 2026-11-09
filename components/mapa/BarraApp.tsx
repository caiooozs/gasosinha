import { cn } from "cn";
import { Logotipo } from "@/components/marca/Marca";

/**
 * Barra do app com o logotipo. No celular, mostra o produto ("Gasolina comum"); no painel do
 * computador, a região coberta.
 */
export function BarraApp({ variante, className }: { variante: "celular" | "painel"; className?: string }) {
  if (variante === "painel") {
    return (
      <div className={cn("flex items-center justify-between px-4 pt-4 pb-3", className)}>
        <Logotipo className="text-lg" />
        <p className="text-xs leading-4 text-ink-2">Recife e região</p>
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
