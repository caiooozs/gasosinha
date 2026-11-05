import type { DataISO } from "@/lib/formato";

/** Um preço com a data da coleta. O preço circula como inteiro em milésimos (6,59 → 6590). */
export type PrecoDatado = {
  data: DataISO;
  precoMilesimos: number;
};

/** Uma coleta de gasolina comum, com a fonte (Princípio I). */
export type Coleta = PrecoDatado & {
  fonte: string;
};

/**
 * Posto como vem do RPC `postos_na_area`. A coleta anterior não traz fonte, porque o RPC só
 * devolve a fonte da coleta atual (contracts/supabase-rpc.md); ela só serve para a variação.
 */
export type PostoNoMapa = {
  cnpj: string;
  nome: string;
  bandeira: string | null;
  municipio: string;
  lat: number;
  lng: number;
  coletaAtual?: Coleta;
  coletaAnterior?: PrecoDatado;
};

/** [oeste, sul, leste, norte], em graus. */
export type Bbox = readonly [oeste: number, sul: number, leste: number, norte: number];
