"use client";

import { usePathname } from "next/navigation";

const ROTA_POSTO = /^\/postos\/(\d{14})$/;

/**
 * O CNPJ do posto aberto no detalhe, lido da rota (`/postos/[cnpj]`), ou `null` sem posto aberto.
 * O marcador desse posto fica destacado no mapa (D5).
 */
export function usePostoAberto(): string | null {
  const rota = usePathname();
  return ROTA_POSTO.exec(rota ?? "")?.[1] ?? null;
}
