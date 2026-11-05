/**
 * Normalização do CNPJ (T023).
 *
 * As fontes da ANP escrevem o mesmo CNPJ de jeitos diferentes: com máscara e espaço (série
 * histórica), como número sem os zeros à esquerda (arquivo semanal do LPC) ou com 14 dígitos
 * (API Revendedores). A forma canônica tem 14 dígitos e dígitos verificadores válidos (R4).
 */

const SO_MASCARA = /^[\d.\-/\s]+$/;
const PESOS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

function digitoVerificador(base: string, pesos: readonly number[]): number {
  let soma = 0;
  for (let i = 0; i < pesos.length; i++) soma += Number(base[i]) * pesos[i];
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function digitosVerificadoresValidos(cnpj: string): boolean {
  const primeiro = digitoVerificador(cnpj, PESOS_1);
  const segundo = digitoVerificador(cnpj, PESOS_2);
  return Number(cnpj[12]) === primeiro && Number(cnpj[13]) === segundo;
}

/** Devolve o CNPJ com 14 dígitos, ou `null` se ele não for um CNPJ válido. */
export function normalizarCnpj(bruto: string | number): string | null {
  let digitos: string;
  if (typeof bruto === "number") {
    if (!Number.isSafeInteger(bruto) || bruto <= 0) return null;
    digitos = String(bruto);
  } else if (typeof bruto === "string") {
    const texto = bruto.trim();
    if (texto === "" || !SO_MASCARA.test(texto)) return null;
    digitos = texto.replace(/\D/g, "");
  } else {
    return null;
  }

  if (digitos.length === 0 || digitos.length > 14) return null;
  const cnpj = digitos.padStart(14, "0");
  if (/^(\d)\1{13}$/.test(cnpj)) return null;
  return digitosVerificadoresValidos(cnpj) ? cnpj : null;
}
