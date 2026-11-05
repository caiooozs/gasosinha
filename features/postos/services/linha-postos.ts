import type { Coleta, PostoNoMapa, PrecoDatado } from "../domain/tipos";

/**
 * Uma linha do RPC `postos_na_area`, tratada como dado externo: os campos podem chegar nulos
 * (`numeric` às vezes como texto), mesmo que os tipos gerados digam o contrário.
 */
export type LinhaPostosNaArea = {
  cnpj: string | null;
  nome: string | null;
  bandeira: string | null;
  municipio: string | null;
  lat: number | null;
  lng: number | null;
  preco_atual: number | string | null;
  data_atual: string | null;
  preco_anterior: number | string | null;
  data_anterior: string | null;
  fonte: string | null;
};

/** Reais → milésimos inteiros (6.59 → 6590), sem deixar o artefato de ponto flutuante passar. */
function emMilesimos(preco: number | string | null): number | null {
  if (preco === null) return null;
  const milesimos = Math.round(Number(preco) * 1000);
  return Number.isFinite(milesimos) && milesimos > 0 ? milesimos : null;
}

function precoDatado(preco: number | string | null, data: string | null): PrecoDatado | undefined {
  const precoMilesimos = emMilesimos(preco);
  if (precoMilesimos === null || !data) return undefined;
  return { data, precoMilesimos };
}

/**
 * Converte a linha do RPC em `PostoNoMapa`. Coleta nula vira `undefined` ("sem preço"); um preço
 * sem fonte também não é exibido (Princípio I). Linha sem CNPJ, nome ou coordenada é descartada.
 */
export function linhaParaPosto(linha: LinhaPostosNaArea): PostoNoMapa | null {
  const { cnpj, nome, lat, lng } = linha;
  if (!cnpj || !nome || lat === null || lng === null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const posto: PostoNoMapa = { cnpj, nome, bandeira: linha.bandeira, municipio: linha.municipio ?? "", lat, lng };
  const atual = precoDatado(linha.preco_atual, linha.data_atual);
  if (atual && linha.fonte) {
    const coletaAtual: Coleta = { ...atual, fonte: linha.fonte };
    posto.coletaAtual = coletaAtual;
    const anterior = precoDatado(linha.preco_anterior, linha.data_anterior);
    if (anterior) posto.coletaAnterior = anterior;
  }
  return posto;
}
