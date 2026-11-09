import type { ReactNode, Ref } from "react";
import { IconeLista } from "@/components/marca/Icones";
import { PoseGasosinha } from "@/components/marca/Marca";
import { LinhaPosto } from "@/components/lista/LinhaPosto";
import type { SentidoPreco } from "@/features/postos/domain/ordenar-lista";
import type { EstadoCarga, ItemListaVM, ReguaVM } from "@/features/postos/viewmodels/tipos";

export type FolhaResumoProps = {
  titulo: string;
  sentido: SentidoPreco;
  estado: EstadoCarga;
  vazia: boolean;
  /** As primeiras linhas da lista, na ordem escolhida. */
  primeiros: ItemListaVM[];
  onVerLista: () => void;
  onTentarDeNovo: () => void;
  onVerRegiaoInteira: () => void;
  /** Atribuição das fontes (FR-030), no pé da folha. */
  atribuicao: ReactNode;
  /** Botão de localização, encostado acima da folha. */
  localizacao: ReactNode;
  /** Botão de tema, logo acima do de localização. */
  tema?: ReactNode;
  /** Com ela, o subtítulo mostra a faixa de preços da área ("De R$ 6,19 a R$ 6,59"). */
  regua?: ReguaVM | null;
  verListaRef?: Ref<HTMLButtonElement>;
};

const BOTAO_PILULA =
  "flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-line-strong bg-glass-fill px-3.5 text-sm leading-4 font-semibold text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

/**
 * Folha inferior do mapa no celular ("01 Mapa · mobile · glass"): de vidro, sobre o mapa, com o
 * resumo da área, o Gasosinha, as primeiras linhas da lista e o botão "Ver lista". Também mostra
 * os estados de carregamento, vazio e erro, para eles não dependerem do mapa.
 */
export function FolhaResumo({
  titulo,
  sentido,
  estado,
  vazia,
  primeiros,
  onVerLista,
  onTentarDeNovo,
  onVerRegiaoInteira,
  atribuicao,
  localizacao,
  tema,
  regua,
  verListaRef,
}: FolhaResumoProps) {
  let cabecalho: { titulo: string; texto: ReactNode; papel?: "status" | "alert" };
  let acao: ReactNode = (
    <button ref={verListaRef} type="button" onClick={onVerLista} className={BOTAO_PILULA}>
      <IconeLista className="size-4" />
      Ver lista
    </button>
  );
  if (estado === "carregando" && vazia) {
    cabecalho = { titulo: "Buscando os preços…", texto: "Carregando os postos da área visível do mapa.", papel: "status" };
  } else if (estado === "erro" && vazia) {
    cabecalho = { titulo: "Não foi possível carregar os postos.", texto: "Confira a conexão e tente de novo.", papel: "alert" };
    acao = (
      <button type="button" onClick={onTentarDeNovo} className={BOTAO_PILULA}>
        Tentar de novo
      </button>
    );
  } else if (vazia) {
    cabecalho = { titulo: "Nenhum posto nesta área", texto: "Afaste o mapa ou busque outra cidade." };
    acao = (
      <button type="button" onClick={onVerRegiaoInteira} className={BOTAO_PILULA}>
        Ver a região inteira
      </button>
    );
  } else if (regua) {
    cabecalho = {
      titulo,
      texto: (
        <>
          De <b className="font-semibold text-ink tabular-nums">{regua.menor}</b> a{" "}
          <b className="font-semibold text-ink tabular-nums">{regua.maior}</b>
        </>
      ),
    };
  } else {
    cabecalho = { titulo, texto: sentido === "asc" ? "Do mais barato ao mais caro" : "Do mais caro ao mais barato" };
  }

  return (
    <section aria-label="Resumo da área visível" className="glass-folha relative rounded-t-[24px]">
      <div className="absolute right-4 bottom-full mb-4 flex flex-col items-end gap-2">
        {tema}
        {localizacao}
      </div>

      <div className="flex justify-center pt-2.5 pb-1.5" aria-hidden="true">
        <div className="h-1 w-9 rounded-[2px] bg-line-strong" />
      </div>

      <div className="flex items-center gap-3 pt-1.5 pr-5 pb-3.5 pl-3.5">
        <PoseGasosinha pose={estado === "carregando" && vazia ? "correndo" : "mapa"} className="size-14" />
        <div role={cabecalho.papel} className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="font-serif text-[20px] leading-[26px] font-semibold tracking-[-0.01em] text-ink">{cabecalho.titulo}</p>
          <p className="text-sm text-ink-2">{cabecalho.texto}</p>
        </div>
        {acao}
      </div>

      {estado === "erro" && !vazia && (
        <div role="alert" className="flex items-center justify-between gap-3 border-t border-yellow-line bg-yellow-soft px-5 py-2.5 text-sm text-yellow-ink">
          <p className="font-medium">Não foi possível carregar os postos.</p>
          <button
            type="button"
            onClick={onTentarDeNovo}
            className="shrink-0 cursor-pointer rounded-full bg-ink px-3 py-1 text-sm font-semibold text-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Tentar de novo
          </button>
        </div>
      )}

      {primeiros.length > 0 && (
        <ul className="border-t border-line">
          {primeiros.map((item) => (
            <li key={item.cnpj}>
              <LinhaPosto item={item} />
            </li>
          ))}
        </ul>
      )}

      <div className="px-5 pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">{atribuicao}</div>
    </section>
  );
}
