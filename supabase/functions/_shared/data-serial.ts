/**
 * Datas das fontes (T025): serial do Excel, dd/mm/aaaa e contas sobre datas AAAA-MM-DD.
 *
 * Toda a aritmética é em UTC, para que uma data não mude com o fuso de quem roda o código.
 * Nada aqui formata datas para exibição; isso é papel de lib/formato (Princípio VIII).
 */

export type Periodo = { inicio: string; fim: string };

const DIA_MS = 86_400_000;
const BASE_EXCEL_MS = Date.UTC(1899, 11, 30);
const SERIAL_MAXIMO = 2_958_465; // 31/12/9999

const doisDigitos = (n: number) => String(n).padStart(2, "0");
const isoDe = (ano: number, mes: number, dia: number) => `${ano}-${doisDigitos(mes)}-${doisDigitos(dia)}`;

function partesIso(iso: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) return null;
  return [ano, mes, dia];
}

function msUtc(iso: string): number {
  const partes = partesIso(iso);
  if (!partes) throw new RangeError(`data AAAA-MM-DD inválida: ${iso}`);
  return Date.UTC(partes[0], partes[1] - 1, partes[2]);
}

/** Serial do Excel (base 1899-12-30) para AAAA-MM-DD. Só aceita inteiro positivo. */
export function serialExcelParaIso(bruto: number | string): string | null {
  const texto = typeof bruto === "number" ? String(bruto) : bruto.trim();
  if (!/^\d+$/.test(texto)) return null;
  const serial = Number(texto);
  if (serial < 1 || serial > SERIAL_MAXIMO) return null;
  return new Date(BASE_EXCEL_MS + serial * DIA_MS).toISOString().slice(0, 10);
}

/** dd/mm/aaaa para AAAA-MM-DD, recusando datas que não existem. */
export function dataBrParaIso(texto: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim());
  if (!m) return null;
  const iso = isoDe(Number(m[3]), Number(m[2]), Number(m[1]));
  return partesIso(iso) ? iso : null;
}

/** A data está no período, incluindo as duas pontas. */
export function dentroDoPeriodo(data: string, periodo: Periodo): boolean {
  return data >= periodo.inicio && data <= periodo.fim;
}

/** A data `meses` meses antes de `hoje`, com o dia ajustado ao último dia do mês. */
export function inicioDaJanela(hoje: string, meses: number): string {
  const partes = partesIso(hoje);
  if (!partes) throw new RangeError(`data AAAA-MM-DD inválida: ${hoje}`);
  const [ano, mes, dia] = partes;
  const total = ano * 12 + (mes - 1) - meses;
  const novoAno = Math.floor(total / 12);
  const novoMes = (total % 12) + 1;
  const ultimoDia = new Date(Date.UTC(novoAno, novoMes, 0)).getUTCDate();
  return isoDe(novoAno, novoMes, Math.min(dia, ultimoDia));
}

/** Dias entre duas datas AAAA-MM-DD (positivo quando `fim` vem depois de `inicio`). */
export function diferencaEmDias(inicio: string, fim: string): number {
  return Math.round((msUtc(fim) - msUtc(inicio)) / DIA_MS);
}

/** A data de hoje (AAAA-MM-DD) no fuso America/Sao_Paulo. */
export function dataEmSaoPaulo(agora: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}
