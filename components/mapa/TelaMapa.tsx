"use client";

import { cn } from "cn";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { AtribuicaoFontes } from "@/components/avisos/AtribuicaoFontes";
import { BuscaCidade } from "@/components/busca/BuscaCidade";
import { ListaPostos } from "@/components/lista/ListaPostos";
import { IconeMapa } from "@/components/marca/Icones";
import { REGIAO_PADRAO, type Limites } from "@/features/busca/data/municipios-rmr";
import { useDetalheAberto } from "@/features/postos/viewmodels/useDetalheAberto";
import { useListaPostos } from "@/features/postos/viewmodels/useListaPostos";
import { usePostosNaArea } from "@/features/postos/viewmodels/usePostosNaArea";
import { useStatusFontes } from "@/features/status-fontes/viewmodels/useStatusFontes";
import { useTema } from "@/features/tema/viewmodels/useTema";
import type { DataISO } from "@/lib/formato";
import { BarraApp } from "./BarraApp";
import { BotaoLocalizacao } from "./BotaoLocalizacao";
import { BotaoTema } from "./BotaoTema";
import { FolhaResumo } from "./FolhaResumo";
import { MapaCarregavel } from "./MapaCarregavel";
import type { AreaMapa, CoberturaMapa, ControleMapa } from "./MapaPostos";

export type TelaMapaProps = {
  /** O "hoje" do servidor (`hojeParaRender`). */
  hoje: DataISO;
  centroInicial?: { lng: number; lat: number };
  /** Detalhe do posto (US2): quando é passado, ocupa o lugar da lista. */
  painel?: ReactNode;
};

type Vista = "mapa" | "lista";

// Espaço entre a lista flutuante e o mapa livre à direita dela.
const FOLGA_PAINEL = 16;

/**
 * Composição cliente da tela do mapa, na forma da identidade visual (Paper: "01 Mapa · mobile ·
 * glass" e "04 Mapa · desktop · glass"):
 * - no celular, o mapa com a busca flutuante e a folha de resumo de vidro por cima, ou a lista
 *   inteira, alternados por "Ver lista" e "Ver mapa";
 * - a partir de `md`, o mapa ocupa a tela e a lista flutua num cartão de vidro de 336 px.
 * Os dados vêm só dos viewmodels (Princípio IV).
 */
export function TelaMapa({ hoje, centroInicial, painel }: TelaMapaProps) {
  const [area, setArea] = useState<AreaMapa | null>(null);
  const [vista, setVista] = useState<Vista>(painel ? "lista" : "mapa");
  const controleRef = useRef<ControleMapa | null>(null);
  const tituloListaRef = useRef<HTMLHeadingElement>(null);
  const verListaRef = useRef<HTMLButtonElement>(null);
  const { tema } = useTema();

  // Os painéis flutuam sobre o mapa: mede quanto dele cada um cobre, para a área visível (e a
  // contagem "N postos nesta área") ser só o que a pessoa vê.
  const painelRef = useRef<HTMLElement>(null);
  const folhaRef = useRef<HTMLDivElement>(null);
  const [cobertura, setCobertura] = useState<CoberturaMapa>({ esquerda: 0, inferior: 0 });
  useEffect(() => {
    const medir = () => {
      const lista = painelRef.current;
      const folha = folhaRef.current;
      // A lista só cobre o mapa quando flutua (computador); no celular ela troca de lugar com ele.
      const flutuante = lista !== null && getComputedStyle(lista).position === "absolute";
      const esquerda = flutuante ? Math.round(lista.offsetLeft + lista.offsetWidth + FOLGA_PAINEL) : 0;
      // A folha some no computador (display: none) e mede 0.
      const inferior = folha ? Math.round(folha.getBoundingClientRect().height) : 0;
      setCobertura((atual) => (atual.esquerda === esquerda && atual.inferior === inferior ? atual : { esquerda, inferior }));
    };
    const observador = new ResizeObserver(medir);
    if (painelRef.current) observador.observe(painelRef.current);
    if (folhaRef.current) observador.observe(folhaRef.current);
    window.addEventListener("resize", medir);
    medir();
    return () => {
      observador.disconnect();
      window.removeEventListener("resize", medir);
    };
  }, []);

  // Ao abrir um posto pela lista ou pelo mapa, guarda o item de origem; quando o detalhe fecha e a
  // rota volta para onde estava, o foco volta para ele (US2, cenário 6; FR-031). Trocar de posto
  // com o detalhe aberto mantém a rota de antes do primeiro posto, porque "Fechar" volta direto
  // para ela (D1), e o foco vai para o último item escolhido.
  const pathname = usePathname();
  const detalheAberto = useDetalheAberto();
  const origemRef = useRef<{ elemento: HTMLElement; rota: string } | null>(null);
  const lembrarOrigem = (evento: MouseEvent<HTMLDivElement>) => {
    const alvo = evento.target instanceof Element ? evento.target.closest<HTMLElement>("[data-cnpj]") : null;
    if (!alvo) return;
    const rota = detalheAberto && origemRef.current ? origemRef.current.rota : pathname;
    origemRef.current = { elemento: alvo, rota };
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
    <div onClickCapture={lembrarOrigem} className="relative flex min-h-0 flex-1 flex-col">
      <h1 className="sr-only">Gasosinha: preço da gasolina comum nos postos da Região Metropolitana do Recife</h1>
      <BarraApp variante="celular" className="md:hidden" />

      <aside
        ref={painelRef}
        aria-label="Postos da área visível"
        className={cn(
          "relative min-h-0 flex-1 flex-col bg-bg",
          // Computador: cartão de vidro sobre o mapa, com altura pelo conteúdo e espaço embaixo
          // para os controles do mapa. O cartão corta nas pontas arredondadas, e quem rola é o filho.
          "md:glass md:absolute md:top-4 md:left-4 md:z-20 md:flex md:max-h-[min(680px,calc(100%-92px))] md:w-[336px] md:flex-none md:overflow-hidden md:rounded-[18px]",
          vista === "lista" ? "flex" : "hidden",
        )}
      >
        <div className="rolagem-fina flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-initial">
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
              regua={lista.regua}
              substituirHistorico={detalheAberto}
              mostrarMais={lista.mostrarMais}
              busca={<BuscaCidade variante="painel" aoSelecionar={centralizarEmLimites} />}
            />
          )}
          <AtribuicaoFontes atualizadoEm={precosAtualizadosEm} className="px-5 pt-6 pb-4 md:hidden" />
          <div className="sticky bottom-0 mt-auto flex justify-center bg-linear-to-b from-bg/0 to-bg to-45% pt-10 pb-[max(env(safe-area-inset-bottom),16px)] md:hidden">
            <button
              type="button"
              onClick={verMapa}
              className="flex h-12 cursor-pointer items-center gap-2 rounded-full bg-ink px-5 text-base leading-[18px] font-semibold text-bg shadow-[0_8px_20px_#1C191738] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <IconeMapa className="size-[18px]" />
              Ver mapa
            </button>
          </div>
        </div>
      </aside>

      <section
        aria-label="Mapa dos postos"
        className={cn("relative min-h-0 flex-1 flex-col", vista === "mapa" ? "flex" : "hidden md:flex")}
      >
        {/* O mapa vai até o fim da tela e passa por baixo da folha de vidro; a área visível desconta a folha. */}
        <div className="relative min-h-0 flex-1">
          <MapaCarregavel
            marcadores={postos.marcadores}
            grupos={postos.grupos}
            aoMudarArea={setArea}
            centroInicial={centroInicial}
            controleRef={controleRef}
            escuro={tema === "escuro"}
            cobertura={cobertura}
            substituirHistorico={detalheAberto}
            controles={
              <>
                <BotaoTema variante="quadrado" />
                <BotaoLocalizacao variante="pilula" aoCentralizar={centralizarEm} />
                <AtribuicaoFontes variante="pilula" atualizadoEm={precosAtualizadosEm} />
              </>
            }
          />
          <div className="absolute inset-x-4 top-3 z-10 md:hidden">
            <BuscaCidade variante="flutuante" aoSelecionar={centralizarEmLimites} />
          </div>
        </div>
        <div ref={folhaRef} className="absolute inset-x-0 bottom-0 z-10 md:hidden">
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
            tema={<BotaoTema variante="redondo" />}
            regua={lista.regua}
            localizacao={<BotaoLocalizacao variante="redondo" aoCentralizar={centralizarEm} />}
            atribuicao={<AtribuicaoFontes atualizadoEm={precosAtualizadosEm} />}
          />
        </div>
      </section>
    </div>
  );
}
