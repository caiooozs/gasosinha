"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Os preços mudam no máximo uma vez por dia: uma hora de cache no navegador basta.
const UMA_HORA_MS = 3_600_000;

let queryClientDoNavegador: QueryClient | undefined;

function criarQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { staleTime: UMA_HORA_MS } } });
}

function obterQueryClient() {
  // Um QueryClient por render no servidor (requisições isoladas) e um só no navegador (cache preservado),
  // como no guia de TanStack Query do Next.
  if (typeof window === "undefined") return criarQueryClient();
  queryClientDoNavegador ??= criarQueryClient();
  return queryClientDoNavegador;
}

export function Providers({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={obterQueryClient()}>{children}</QueryClientProvider>;
}
