/**
 * Plano de sincronização do cadastro (T032): o que inserir, atualizar, desativar e reativar, e o
 * que fica inalterado. O sync-postos só escreve nas linhas que mudaram (SC-006).
 */
import type { PostoNormalizado } from "./schemas.ts";

/** Os dados de um posto como estão gravados, mais a situação. */
export type PostoGravado = Omit<PostoNormalizado, "localizacaoInvalida"> & { ativo: boolean };

export type PlanoSincronizacao = {
  /** O retrato tem pelo menos 80% dos ativos gravados (os novos não contam). */
  valido: boolean;
  inserir: PostoNormalizado[];
  /** Ativos com algum dado diferente. */
  atualizar: PostoNormalizado[];
  /** CNPJs de ativos sem mudança: nada é escrito neles. */
  inalterados: string[];
  /** CNPJs de ativos ausentes do retrato. */
  desativar: string[];
  /** Inativos que voltaram, com os dados recebidos (uma mudança é gravada junto). */
  reativar: PostoNormalizado[];
};

// Coordenadas comparadas com 6 casas decimais (cerca de 11 cm).
const emMicrograus = (valor: number) => Math.round(valor * 1e6);

function mesmaLocalizacao(a: PostoNormalizado["localizacao"], b: PostoNormalizado["localizacao"]): boolean {
  if (a === null || b === null) return a === b;
  return emMicrograus(a.lat) === emMicrograus(b.lat) && emMicrograus(a.lng) === emMicrograus(b.lng);
}

function mesmosDados(g: PostoGravado, r: PostoNormalizado): boolean {
  return (
    g.razaoSocial === r.razaoSocial &&
    g.bandeira === r.bandeira &&
    g.endereco === r.endereco &&
    g.bairro === r.bairro &&
    g.cep === r.cep &&
    g.municipio === r.municipio &&
    g.uf === r.uf &&
    g.acuraciaEstimada === r.acuraciaEstimada &&
    g.origemLocalizacao === r.origemLocalizacao &&
    mesmaLocalizacao(g.localizacao, r.localizacao)
  );
}

const planoVazio = (valido: boolean): PlanoSincronizacao => ({
  valido,
  inserir: [],
  atualizar: [],
  inalterados: [],
  desativar: [],
  reativar: [],
});

export function planejarSincronizacaoPostos(
  gravados: readonly PostoGravado[],
  recebidos: readonly PostoNormalizado[],
): PlanoSincronizacao {
  const ativos = gravados.filter((g) => g.ativo);
  const cnpjsRecebidos = new Set(recebidos.map((r) => r.cnpj));
  const presentes = ativos.filter((g) => cnpjsRecebidos.has(g.cnpj)).length;
  // presentes / ativos >= 0,8, em inteiros.
  if (ativos.length > 0 && presentes * 5 < ativos.length * 4) return planoVazio(false);

  const porCnpj = new Map(gravados.map((g) => [g.cnpj, g]));
  const plano = planoVazio(true);
  for (const r of recebidos) {
    const g = porCnpj.get(r.cnpj);
    if (!g) plano.inserir.push(r);
    else if (!g.ativo) plano.reativar.push(r);
    else if (mesmosDados(g, r)) plano.inalterados.push(r.cnpj);
    else plano.atualizar.push(r);
  }
  plano.desativar = ativos.filter((g) => !cnpjsRecebidos.has(g.cnpj)).map((g) => g.cnpj);
  return plano;
}
