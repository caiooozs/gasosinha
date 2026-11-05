/**
 * Canonicalização do preço (T024).
 *
 * O XLSX do LPC grava preços como números de ponto flutuante, e alguns vêm com artefato de
 * representação (ex.: 6.4899999999999993 no lugar de 6.49). O preço só é aceito se estiver a
 * menos de 1e-9 de um valor com até 3 casas decimais; qualquer outra diferença é rejeitada, nunca
 * arredondada por palpite (Princípio I, R8).
 *
 * A conta é feita em aritmética decimal exata sobre o texto, sem parseFloat.
 */

export type PrecoCanonico =
  | { ok: true; valor: string; milesimos: number }
  | { ok: false; motivo: "preco_invalido" };

const INVALIDO: PrecoCanonico = { ok: false, motivo: "preco_invalido" };
const DECIMAL = /^(\d+)(?:\.(\d+))?$/;
const MIL = BigInt(1000);
const UM_MILHAO = BigInt(1_000_000);
const LIMITE_MILESIMOS = BigInt(50_000);
const ZERO = BigInt(0);
const UM = BigInt(1);

const potenciaDeDez = (expoente: number) => BigInt(`1${"0".repeat(expoente)}`);

export function canonicalizarPreco(bruto: string | number): PrecoCanonico {
  let texto: string;
  if (typeof bruto === "number") texto = Number.isFinite(bruto) ? String(bruto) : "";
  else if (typeof bruto === "string") texto = bruto.trim();
  else return INVALIDO;

  const partes = DECIMAL.exec(texto);
  if (!partes) return INVALIDO;
  const inteiro = partes[1];
  const fracao = partes[2] ?? "";

  let milesimos = BigInt(inteiro) * MIL + BigInt((fracao + "000").slice(0, 3));
  const resto = fracao.slice(3);
  if (/[1-9]/.test(resto)) {
    // `resto` é a fração de milésimo. Diferença menor que 1e-6 milésimo equivale a diferença
    // menor que 1e-9 no preço.
    const escala = potenciaDeDez(resto.length);
    const fracaoDeMilesimo = BigInt(resto);
    if (fracaoDeMilesimo * UM_MILHAO < escala) {
      // um pouco acima do valor de 3 casas: mantém
    } else if ((escala - fracaoDeMilesimo) * UM_MILHAO < escala) {
      milesimos += UM; // um pouco abaixo: sobe para o valor de 3 casas
    } else {
      return INVALIDO;
    }
  }

  if (milesimos <= ZERO || milesimos >= LIMITE_MILESIMOS) return INVALIDO;
  const n = Number(milesimos);
  return { ok: true, valor: `${Math.floor(n / 1000)}.${String(n % 1000).padStart(3, "0")}`, milesimos: n };
}
