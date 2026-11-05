"use client";

import { TriangleAlertIcon } from "lucide-react";
import { useStatusFontes } from "@/features/status-fontes/viewmodels/useStatusFontes";

/**
 * Aviso de fonte com problema (FR-027, SC-008). Fica no topo, no fluxo da página, sem cobrir o mapa.
 * Não renderiza nada quando está tudo em dia.
 */
export function AvisoFonte() {
  const { aviso } = useStatusFontes();
  if (!aviso) return null;
  return (
    <div role="status" className="flex items-start gap-2 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-950">
      <TriangleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <p>{aviso.texto}</p>
    </div>
  );
}
