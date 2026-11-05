"use client";

import { IconeRelogio } from "@/components/marca/Icones";
import { useStatusFontes } from "@/features/status-fontes/viewmodels/useStatusFontes";

/**
 * Aviso de fonte com problema (FR-027, SC-008). Fica no topo, no fluxo da página, sem cobrir o mapa.
 * Usa o amarelo de destaque da identidade visual. Não renderiza nada quando está tudo em dia.
 */
export function AvisoFonte() {
  const { aviso } = useStatusFontes();
  if (!aviso) return null;
  return (
    <div role="status" className="flex items-start gap-2 border-b border-yellow-line bg-yellow-soft px-4 py-2.5 text-sm text-yellow-ink">
      <IconeRelogio className="mt-0.5 size-4 shrink-0" />
      <p className="font-medium">{aviso.texto}</p>
    </div>
  );
}
