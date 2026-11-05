"use client";

import { cn } from "cn";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { AtribuicaoFontes } from "@/components/avisos/AtribuicaoFontes";
import { BuscaCidade } from "@/components/busca/BuscaCidade";
import { ListaPostos } from "@/components/lista/ListaPostos";
import { IconeMapa } from "@/components/marca/Icones";
import { REGIAO_PADRAO, type Limites } from "@/features/busca/data/municipios-rmr";
import { useListaPostos } from "@/features/postos/viewmodels/useListaPostos";
import { usePostosNaArea } from "@/features/postos/viewmodels/usePostosNaArea";
import { useStatusFontes } from "@/features/status-fontes/viewmodels/useStatusFontes";
import type { DataISO } from "@/lib/formato";
import { BarraApp } from "./BarraApp";
import { BotaoLocalizacao } from "./BotaoLocalizacao";
import { FolhaResumo } from "./FolhaResumo";
import { MapaCarregavel } from "./MapaCarregavel";
import type { AreaMapa, ControleMapa } from "./MapaPostos";

export type TelaMapaProps = {
  /** O "hoje" do servidor (`hojeParaRender`). */
  hoje: DataISO;
  centroInicial?: { lng: number; lat: number };
  /** Detalhe do posto (US2): quando é passado, ocupa o lugar da lista. */
  painel?: ReactNode;
};

type Vista = "mapa" | "lista";

/**
 * Composição cliente da tela do mapa, na forma da identidade visual (Paper: "01 Mapa · mobile",
 * "02 Lista · mobile" e "04 Mapa · desktop"):
 * - no celular, o mapa com a busca flutuante e a folha de resumo, ou a lista inteira, alternados
 *   por "Ver lista" e "Ver mapa";
 * - a partir de `md`, o painel da lista (440 px) à esquerda e o mapa à direita.
 * Os dados vêm só dos viewmodels (Princípio IV).
 */
export function TelaMapa({ hoje, centroInicial, painel }: TelaMapaProps) {
  const [area, setArea] = useState<AreaMapa | null>(null);
  const [vista, setVista] = useState<Vista>(painel ? "lista" : "mapa");
  const controleRef = useRef<ControleMapa | null>(null);
  const tituloListaRef = useRef<HTMLHeadingElement>(null);
  const verListaRef = useRef<HTMLButtonElement>(null);

  // Ao abrir um posto pela lista ou pelo mapa, guarda o item de origem; quando o detalhe fecha e a
  // rota volta para onde estava, o foco volta para ele (US2, cenário 6; FR-031).
  const pathname = usePathname();
  const origemRef = useRef<{ elemento: HTMLElement; rota: string } | null>(null);
  const lembrarOrigem = (evento: MouseEvent<HTMLDivElement>) => {
    const alvo = evento.target instanceof Element ? evento.target.closest<HTMLElement>("[data-cnpj]") : null;
    if (alvo) origemRef.current = { elemento: alvo, rota: pathname };
  };
  useEffect(() => {
    const origem = origemRef.current;
    if (!origem || origem.rota !== pathname) return;
    if (origem.elemento.isConnected) origem.elemento.focus();
    origemRef.current = null;
  }, [pathname]);

  const postos = usePostosNaArea({ bboxVisivel: area?.bboxVisivel ?? null, zoom: area?.zoom ?? 0, hoje });
  const lista = useListaPostos(postos.postosVisiveis, hoje);
  const { precosAtualizadosEm } = useStatusFontes();

  // No celular, o mapa pode estar escondido atrás da lista: mostra o mapa e só então o move.
  const centralizarEmLimites = useCallback((limites: Limites) => {
    setVista("mapa");
    requestAnimationFrame(() => controleRef.current?.centralizarEmLimites(limites));
  }, []);
  const centralizarEm = useCallback((lng: number, lat: number) => {
    setVista("mapa");
    requestAnimationFrame(() => controleRef.current?.centralizarEm(lng, lat));
  }, []);
  const verRegiaoInteira = useCallback(() => centralizarEmLimites(REGIAO_PADRAO), [centralizarEmLimites]);

  // Ao trocar de vista, o foco vai para onde a pessoa continua (FR-031).
  const verLista = () => {
    setVista("lista");
    requestAnimationFrame(() => tituloListaRef.current?.focus());
  };
  const verMapa = () => {
    setVista("mapa");
    requestAnimationFrame(() => verListaRef.current?.focus());
  };

  return (
    <div
      onClickCapture={lembrarOrigem}
      className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[440px_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)]"
    >
      <h1 className="sr-only">Gasosinha: preço da gasolina comum nos postos da Região Metropolitana do Recife</h1>
      <BarraApp variante="celular" className="md:hidden" />

      <aside
        aria-label="Postos da área visível"
        className={cn(
          "relative min-h-0 flex-1 flex-col overflow-y-auto bg-white md:flex md:border-r md:border-line",
          vista === "lista" ? "flex" : "hidden",
        )}
      >
        <BarraApp variante="painel" className="hidden md:flex" />
        {painel ?? (
          <ListaPostos
            titulo={lista.titulo}
            grupos={lista.grupos}
            vazia={lista.vazia}
            sentido={lista.sentido}
            onDefinirSentido={lista.definirSentido}
            estado={postos.estado}
            onTentarDeNovo={postos.tentarDeNovo}
            onVerRegiaoInteira={verRegiaoInteira}
            tituloRef={tituloListaRef}
            busca={<BuscaCidade variante="painel" aoSelecionar={centralizarEmLimites} />}
          />
        )}
        <AtribuicaoFontes atualizadoEm={precosAtualizadosEm} className="px-5 pt-6 pb-4 md:hidden" />
        <div className="sticky bottom-0 mt-auto flex justify-center bg-linear-to-b from-white/0 to-white to-45% pt-10 pb-[max(env(safe-area-inset-bottom),16px)] md:hidden">
          <button
            type="button"
            onClick={verMapa}
            className="flex h-12 cursor-pointer items-center gap-2 rounded-full bg-ink px-5 text-base leading-[18px] font-semibold text-white shadow-[0_8px_20px_#1C191738] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <IconeMapa className="size-[18px]" />
            Ver mapa
          </button>
        </div>
      </aside>

      <section
        aria-label="Mapa dos postos"
        className={cn("min-h-0 flex-1 flex-col", vista === "mapa" ? "flex" : "hidden md:flex")}
      >
        {/* No celular, o mapa termina onde a folha começa: a área visível (e a contagem) é só o que se vê. */}
        <div className="relative min-h-0 flex-1">
          <MapaCarregavel
            marcadores={postos.marcadores}
            grupos={postos.grupos}
            aoMudarArea={setArea}
            centroInicial={centroInicial}
            controleRef={controleRef}
            controles={
              <>
                <BotaoLocalizacao variante="pilula" aoCentralizar={centralizarEm} />
                <AtribuicaoFontes variante="pilula" atualizadoEm={precosAtualizadosEm} />
              </>
            }
          />
          <div className="absolute inset-x-4 top-3 z-10 md:hidden">
            <BuscaCidade variante="flutuante" aoSelecionar={centralizarEmLimites} />
          </div>
        </div>
        {/* A folha sobe 24 px sobre o mapa, só o bastante para os cantos arredondados. */}
        <div className="relative z-10 -mt-6 md:hidden">
          <FolhaResumo
            titulo={lista.titulo}
            sentido={lista.sentido}
            estado={postos.estado}
            vazia={lista.vazia}
            primeiros={lista.primeiros}
            onVerLista={verLista}
            onTentarDeNovo={postos.tentarDeNovo}
            onVerRegiaoInteira={verRegiaoInteira}
            verListaRef={verListaRef}
            localizacao={<BotaoLocalizacao variante="redondo" aoCentralizar={centralizarEm} />}
            atribuicao={<AtribuicaoFontes atualizadoEm={precosAtualizadosEm} />}
          />
        </div>
      </section>
    </div>
  );
}
