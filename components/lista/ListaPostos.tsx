import { cn } from "cn";
import { useId, type ReactNode, type Ref } from "react";
import { BOTAO_CONTORNO, BOTAO_PRIMARIO, EstadoGasosinha } from "@/components/estados/EstadoGasosinha";
import { IconeSetaBaixo, IconeSetaCima } from "@/components/marca/Icones";
import { PoseGasosinha } from "@/components/marca/Marca";
import type { SentidoPreco } from "@/features/postos/domain/ordenar-lista";
import type { EstadoCarga, GrupoListaVM } from "@/features/postos/viewmodels/tipos";
import { LinhaPosto } from "./LinhaPosto";

export type ListaPostosProps = {
  /** "8 postos nesta área". */
  titulo: string;
  grupos: GrupoListaVM[];
  vazia: boolean;
  sentido: SentidoPreco;
  onDefinirSentido: (sentido: SentidoPreco) => void;
  estado: EstadoCarga;
  onTentarDeNovo: () => void;
  onVerRegiaoInteira: () => void;
  /** A busca de cidade, no topo do cabeçalho. */
  busca?: ReactNode;
  /** Recebe o foco quando a pessoa troca para a lista no celular. */
  tituloRef?: Ref<HTMLHeadingElement>;
};

/**
 * Lista dos postos da área visível, alternativa completa ao mapa (FR-010 a FR-012), na forma da
 * identidade visual ("02 Lista · mobile"). Cada linha é um link para o detalhe. Só renderiza o que
 * recebe do viewmodel.
 */
export function ListaPostos(props: ListaPostosProps) {
  const { titulo, grupos, vazia, sentido, onDefinirSentido, estado, onTentarDeNovo, onVerRegiaoInteira, busca, tituloRef } =
    props;
  const semNumeroAinda = estado === "carregando" && vazia;

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-5 border-b border-line px-4 pb-4">
        {busca}
        <div className="flex items-center gap-3 px-1">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 ref={tituloRef} tabIndex={-1} className="font-serif text-2xl font-semibold tracking-[-0.01em] text-ink outline-none">
              {semNumeroAinda ? "Postos nesta área" : titulo}
            </h2>
            <p className="text-sm text-ink-2">Área visível do mapa · gasolina comum</p>
          </div>
          <PoseGasosinha pose="preco" className="h-16 w-[92px]" />
        </div>
        <OrdemPreco sentido={sentido} onDefinirSentido={onDefinirSentido} />
      </div>

      {estado === "carregando" && vazia && (
        <EstadoGasosinha
          papel="status"
          pose="correndo"
          titulo="Buscando os preços…"
          texto="Carregando os postos da área visível do mapa."
        >
          <EsqueletoLinhas />
        </EstadoGasosinha>
      )}

      {estado === "erro" && vazia && (
        <EstadoGasosinha
          papel="alert"
          pose="pensando"
          titulo="Não foi possível carregar os postos."
          texto="Confira a conexão e tente de novo."
          acao={
            <button type="button" onClick={onTentarDeNovo} className={BOTAO_PRIMARIO}>
              Tentar de novo
            </button>
          }
        />
      )}

      {estado === "erro" && !vazia && (
        <div role="alert" className="flex items-center justify-between gap-3 border-b border-yellow-line bg-yellow-soft px-5 py-3 text-sm text-yellow-ink">
          <p className="font-medium">Não foi possível carregar os postos.</p>
          <button
            type="button"
            onClick={onTentarDeNovo}
            className="shrink-0 cursor-pointer rounded-full bg-ink px-3.5 py-1.5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Tentar de novo
          </button>
        </div>
      )}

      {estado === "pronto" && vazia && (
        <EstadoGasosinha
          pose="mapa"
          titulo="Nenhum posto nesta área"
          texto="Afaste o mapa ou busque outra cidade da região."
          acao={
            <button type="button" onClick={onVerRegiaoInteira} className={BOTAO_CONTORNO}>
              Ver a região inteira
            </button>
          }
        />
      )}

      {grupos.map((grupo) => (
        <GrupoDaLista key={grupo.titulo} grupo={grupo} />
      ))}
    </div>
  );
}

/** "Menor preço | Maior preço": controle segmentado da ordem de preço (FR-011). */
export function OrdemPreco({ sentido, onDefinirSentido }: { sentido: SentidoPreco; onDefinirSentido: (s: SentidoPreco) => void }) {
  const opcoes = [
    { valor: "asc" as const, rotulo: "Menor preço", Icone: IconeSetaCima },
    { valor: "desc" as const, rotulo: "Maior preço", Icone: IconeSetaBaixo },
  ];
  return (
    <div role="group" aria-label="Ordem de preço" className="flex rounded-[12px] bg-surface p-[3px]">
      {opcoes.map(({ valor, rotulo, Icone }) => {
        const ativo = sentido === valor;
        return (
          <button
            key={valor}
            type="button"
            aria-pressed={ativo}
            onClick={() => onDefinirSentido(valor)}
            className={cn(
              "flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[9px] text-sm leading-4 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink",
              ativo
                ? "bg-white font-semibold text-ink shadow-[0_1px_2px_#1C19171A,0_0_0_1px_#1C19170F]"
                : "font-medium text-ink-2 hover:text-ink",
            )}
          >
            <Icone className="size-3.5" />
            {rotulo}
          </button>
        );
      })}
    </div>
  );
}

function GrupoDaLista({ grupo }: { grupo: GrupoListaVM }) {
  const idTitulo = useId();
  return (
    <section aria-labelledby={idTitulo}>
      <h3 id={idTitulo} className="px-5 pt-5 pb-2 text-xs leading-4 font-medium tracking-wide text-ink-3 uppercase">
        {grupo.titulo}
      </h3>
      <ul className="border-t border-line">
        {grupo.itens.map((item) => (
          <li key={item.cnpj}>
            <LinhaPosto item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Linhas fantasmas enquanto os preços chegam (identidade visual, "Carregando · correndo"). */
function EsqueletoLinhas() {
  return (
    <div aria-hidden="true" className="flex w-full flex-col gap-2.5 pt-2">
      {[150, 128].map((largura) => (
        <div key={largura} className="flex items-center justify-between border-t border-line py-3">
          <div className="flex flex-col gap-1.5">
            <div className="h-3 rounded-[4px] bg-surface-2" style={{ width: largura }} />
            <div className="h-2.5 rounded-[4px] bg-surface" style={{ width: largura - 46 }} />
          </div>
          <div className="h-[18px] w-16 rounded-[4px] bg-surface-2" />
        </div>
      ))}
    </div>
  );
}
