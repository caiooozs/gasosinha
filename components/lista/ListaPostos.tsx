import { cn } from "cn";
import { ArrowDownUpIcon, ClockIcon } from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import type { SentidoPreco } from "@/features/postos/domain/ordenar-lista";
import type { EstadoCarga, GrupoListaVM, ItemListaVM } from "@/features/postos/viewmodels/tipos";

export type ListaPostosProps = {
  grupos: GrupoListaVM[];
  vazia: boolean;
  sentido: SentidoPreco;
  onAlternarSentido: () => void;
  estado: EstadoCarga;
  onTentarDeNovo: () => void;
};

const SENTIDOS: Record<SentidoPreco, string> = {
  asc: "Mais barato primeiro",
  desc: "Mais caro primeiro",
};

/**
 * Lista dos postos da área visível, alternativa completa ao mapa (FR-010 a FR-012). Cada item é um
 * link para o detalhe. Só renderiza o que recebe do viewmodel.
 */
export function ListaPostos({ grupos, vazia, sentido, onAlternarSentido, estado, onTentarDeNovo }: ListaPostosProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onAlternarSentido}>
          <ArrowDownUpIcon aria-hidden="true" />
          <span className="sr-only">Ordem de preço: </span>
          {SENTIDOS[sentido]}
        </Button>
      </div>

      {estado === "carregando" && (
        <p role="status" className="text-sm text-muted-foreground">
          Carregando postos…
        </p>
      )}

      {estado === "erro" && (
        <div role="alert" className="flex flex-col items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-950">
          <p>Não foi possível carregar os postos.</p>
          <Button type="button" size="sm" onClick={onTentarDeNovo}>
            Tentar de novo
          </Button>
        </div>
      )}

      {estado === "pronto" && vazia && <p className="text-sm text-muted-foreground">Nenhum posto nesta área</p>}

      {grupos.map((grupo) => (
        <GrupoDaLista key={grupo.titulo} grupo={grupo} />
      ))}
    </div>
  );
}

function GrupoDaLista({ grupo }: { grupo: GrupoListaVM }) {
  const idTitulo = useId();
  return (
    <section aria-labelledby={idTitulo} className="flex flex-col gap-2">
      <h2 id={idTitulo} className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {grupo.titulo}
      </h2>
      <ul className="flex flex-col gap-2">
        {grupo.itens.map((item) => (
          <li key={item.cnpj}>
            <ItemDaLista item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ItemDaLista({ item }: { item: ItemListaVM }) {
  return (
    <Link
      href={`/postos/${item.cnpj}`}
      className="flex flex-col gap-1.5 rounded-lg border bg-card p-3 text-card-foreground transition-colors hover:bg-muted focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 flex-col">
          <span className="font-medium break-words">{item.nome}</span>
          <span className="text-xs text-muted-foreground">{item.bandeira}</span>
        </span>
        {item.semPreco ? (
          <span className="shrink-0 rounded-full border border-dashed border-neutral-600 px-2 py-0.5 text-xs font-medium text-neutral-700">
            sem preço
          </span>
        ) : (
          <span className="shrink-0 text-lg font-semibold tabular-nums">{item.preco}</span>
        )}
      </span>

      {!item.semPreco && (
        <>
          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
            <span>coletado em {item.data}</span>
            <span aria-hidden="true">·</span>
            <span
              className={cn(
                "inline-flex items-center gap-1",
                item.antiga && "rounded-sm bg-amber-100 px-1.5 py-0.5 font-medium text-amber-950",
              )}
            >
              {item.antiga && <ClockIcon aria-hidden="true" className="size-3.5 shrink-0" />}
              {item.idade}
              {item.antiga && <span> · coleta antiga</span>}
            </span>
          </span>
          <span className="text-xs tabular-nums">{item.variacao ?? "sem coleta anterior"}</span>
          <span className="text-xs text-muted-foreground">Fonte: {item.fonte}</span>
        </>
      )}
    </Link>
  );
}
