import "server-only";
import { cacheLife } from "next/cache";
import { hojeEmSaoPaulo, type DataISO } from "@/lib/formato";

/**
 * O "hoje" (AAAA-MM-DD, fuso de São Paulo) para o render no servidor. Com Cache Components, ler a
 * hora no pré-render quebra o build; em `'use cache'` ela fica guardada por algumas horas, e no
 * navegador `useHoje` passa a usar a data local depois da hidratação.
 */
export async function hojeParaRender(): Promise<DataISO> {
  "use cache";
  cacheLife("hours");
  return hojeEmSaoPaulo(new Date());
}
