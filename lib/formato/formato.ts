/**
 * O único módulo de formatação do projeto (Princípio VIII): moeda, data, idade, percentual e
 * variação, em português do Brasil. Nenhum outro arquivo formata esses valores.
 *
 * Datas chegam como texto AAAA-MM-DD e nunca passam por `new Date('AAAA-MM-DD')`, que as leria em
 * UTC e poderia mostrar o dia anterior.
 */

/** Data no formato AAAA-MM-DD. */
export type DataISO = string;
export type UnidadeIdade = "dias" | "semanas" | "meses";

const MENOS = "−";
const DIA_MS = 86_400_000;

const moedaDuasCasas = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const moedaTresCasas = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});
const umaCasa = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const dataSaoPaulo = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function partes(data: DataISO): [number, number, number] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  if (!m) throw new RangeError(`data fora do formato AAAA-MM-DD: ${data}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** Preço em milésimos de real: 6590 → "R$ 6,59"; 6599 → "R$ 6,599" (3 casas só quando a fonte trouxe 3). */
export function formatarPreco(milesimos: number): string {
  const formato = milesimos % 10 === 0 ? moedaDuasCasas : moedaTresCasas;
  return formato.format(milesimos / 1000);
}

/** "2026-10-20" → "20/10/2026". */
export function formatarData(data: DataISO): string {
  const [ano, mes, dia] = partes(data);
  return `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`;
}

/** A data de hoje (AAAA-MM-DD) no fuso America/Sao_Paulo. */
export function hojeEmSaoPaulo(agora: Date): DataISO {
  return dataSaoPaulo.format(agora);
}

/** Dias entre duas datas AAAA-MM-DD, contados em UTC. */
export function diasEntre(inicio: DataISO, fim: DataISO): number {
  const [a1, m1, d1] = partes(inicio);
  const [a2, m2, d2] = partes(fim);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / DIA_MS);
}

/** "há 7 dias" / "há 7 d", "há 5 semanas" / "há 5 sem", "há 4 meses", ou "hoje". */
export function formatarIdade(idade: { unidade: UnidadeIdade; valor: number }, curta: boolean): string {
  const { unidade, valor } = idade;
  if (unidade === "dias") {
    if (valor === 0) return "hoje";
    if (curta) return `há ${valor} d`;
    return valor === 1 ? "há 1 dia" : `há ${valor} dias`;
  }
  if (unidade === "semanas") {
    if (curta) return `há ${valor} sem`;
    return valor === 1 ? "há 1 semana" : `há ${valor} semanas`;
  }
  return valor === 1 ? "há 1 mês" : `há ${valor} meses`;
}

/** 1.5 → "+1,5%"; -3 → "−3,0%" (sinal de menos U+2212); 0 → "0,0%". */
export function formatarPercentual(percentual: number): string {
  const texto = umaCasa.format(Math.abs(percentual));
  if (texto === "0,0") return "0,0%";
  return `${percentual > 0 ? "+" : MENOS}${texto}%`;
}

/** "+R$ 0,10 (+1,5%) desde 13/10/2026"; "−R$ 0,20 (−3,0%) desde …"; "R$ 0,00 (0,0%) desde …". */
export function formatarVariacao(variacao: { diferencaMilesimos: number; percentual: number; desde: DataISO }): string {
  const { diferencaMilesimos, percentual, desde } = variacao;
  const sinal = diferencaMilesimos > 0 ? "+" : diferencaMilesimos < 0 ? MENOS : "";
  return `${sinal}${formatarPreco(Math.abs(diferencaMilesimos))} (${formatarPercentual(percentual)}) desde ${formatarData(desde)}`;
}
