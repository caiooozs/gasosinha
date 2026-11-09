import { cn } from "cn";
import { separarMoeda } from "@/lib/formato";

/**
 * Valor em reais com o "R$" menor que o número (identidade visual, padrão do seuimposto: número
 * grande, unidade pequena). O espaço não separável fica junto do símbolo, então o texto continua
 * sendo lido como "R$ 6,59". Só muda o tamanho: o texto vem pronto do viewmodel.
 */
export function Moeda({ texto, className, classeSimbolo }: { texto: string; className?: string; classeSimbolo?: string }) {
  const { simbolo, valor } = separarMoeda(texto);
  return (
    <span className={cn("tabular-nums", className)}>
      {simbolo && <span className={cn("text-[0.6em] tracking-normal", classeSimbolo)}>{`${simbolo} `}</span>}
      {valor}
    </span>
  );
}
