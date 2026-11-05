import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { defaultShouldDehydrateQuery, QueryClient, type DehydratedState, type QueryKey } from "@tanstack/react-query";

/**
 * Estado de hidratação pré-renderizável (guia "TanStack Query" do Next, seção "Build a
 * prerenderable hydration state"). O `dehydrate()` do TanStack lê `Date.now()`, o que quebra o
 * pré-render com Cache Components; aqui só o instante fica em cache, com as mesmas tags dos dados,
 * e o estado é montado à mão.
 */

type ConsultaHidratada = {
  queryKey: QueryKey;
  data: unknown;
};

async function instanteDaHidratacao(tags: string[]): Promise<number> {
  "use cache";
  cacheTag(...tags);
  cacheLife("max");
  return Date.now();
}

export async function dehydrate(consultas: ConsultaHidratada[], opcoes: { tags: string[] }): Promise<DehydratedState> {
  const atualizadoEm = await instanteDaHidratacao(opcoes.tags);
  const cliente = new QueryClient();
  for (const consulta of consultas) {
    cliente.setQueryData(consulta.queryKey, consulta.data, { updatedAt: atualizadoEm });
  }
  return {
    mutations: [],
    queries: cliente
      .getQueryCache()
      .getAll()
      .filter((consulta) => defaultShouldDehydrateQuery(consulta))
      .map((consulta) => ({
        dehydratedAt: atualizadoEm,
        queryHash: consulta.queryHash,
        queryKey: consulta.queryKey,
        state: consulta.state,
        ...(consulta.meta ? { meta: consulta.meta } : {}),
      })),
  };
}
