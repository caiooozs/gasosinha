import { diasEntre, formatarData, hojeEmSaoPaulo, type DataISO } from "@/lib/formato";
import { ATRASO_CADASTRO_DIAS, ATRASO_PRECOS_DIAS } from "@/supabase/functions/_shared/alerta";

/** A linha de `estado_fontes` como o front a lê (contracts/supabase-rpc.md). */
export type EstadoFonteLido = {
  fonte: string;
  ultima_ok_em: string | null;
  ultima_edicao_fim: string | null;
  em_problema: boolean;
  tipo_problema: string | null;
  problema_desde: string | null;
};

export type AvisoFontes = { texto: string };

const TEXTO_BASE = "Alguns dados podem estar desatualizados.";

/** Instante ISO (timestamptz) → data AAAA-MM-DD no fuso de São Paulo. */
function dataLocal(instante: string | null): DataISO | null {
  if (!instante) return null;
  const ms = Date.parse(instante);
  return Number.isNaN(ms) ? null : hojeEmSaoPaulo(new Date(ms));
}

/**
 * Decide se a fonte está com problema e qual é a data da última atualização bem-sucedida dela.
 * Os prazos são os mesmos da ingestão (`_shared/alerta.ts`); o front também os aplica, para o aviso
 * aparecer mesmo se o agendamento inteiro parar e ninguém marcar `em_problema`.
 *
 * A data mostrada é a da última execução bem-sucedida; no atraso dos preços, em que as execuções
 * continuam dando certo sem trazer edição nova, é o fim da edição mais recente incorporada.
 */
function avaliarFonte(estado: EstadoFonteLido, hoje: DataISO): { problema: boolean; data: DataISO | null } {
  const okEm = dataLocal(estado.ultima_ok_em);
  if (estado.fonte === "precos") {
    const edicaoFim = estado.ultima_edicao_fim;
    const atrasado = !edicaoFim || diasEntre(edicaoFim, hoje) > ATRASO_PRECOS_DIAS;
    if (atrasado || (estado.em_problema && estado.tipo_problema === "atraso")) {
      return { problema: true, data: edicaoFim };
    }
    return { problema: estado.em_problema, data: okEm };
  }
  const atrasado = !okEm || diasEntre(okEm, hoje) > ATRASO_CADASTRO_DIAS;
  return { problema: atrasado || estado.em_problema, data: okEm };
}

/**
 * Aviso de fonte com problema (FR-027), ou `null` quando está tudo em dia. O texto traz a data mais
 * antiga entre as fontes com problema; se alguma nunca deu certo, o texto vai sem data.
 */
export function avaliarStatus(estados: readonly EstadoFonteLido[], hoje: DataISO): AvisoFontes | null {
  const comProblema = estados.map((e) => avaliarFonte(e, hoje)).filter((a) => a.problema);
  if (comProblema.length === 0) return null;
  if (comProblema.some((a) => a.data === null)) return { texto: TEXTO_BASE };
  const maisAntiga = comProblema
    .map((a) => a.data as DataISO)
    .reduce((menor, data) => (data < menor ? data : menor));
  return { texto: `${TEXTO_BASE} Última atualização bem-sucedida em ${formatarData(maisAntiga)}.` };
}
