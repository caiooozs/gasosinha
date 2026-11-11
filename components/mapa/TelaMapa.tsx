"use client";

import { cn } from "cn";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { AtribuicaoFontes } from "@/components/avisos/AtribuicaoFontes";
import { BuscaCidade } from "@/components/busca/BuscaCidade";
import { FolhaLista } from "@/components/lista/FolhaLista";
import { ListaPostos } from "@/components/lista/ListaPostos";
import { BotaoRecolherLista, PilulaCelular, PilulaLista } from "@/components/lista/PilulaLista";
import { Logotipo } from "@/components/marca/Marca";
import { REGIAO_PADRAO, type Limites } from "@/features/busca/data/municipios-rmr";
import { useAcompanharLocalizacao } from "@/features/localizacao/viewmodels/useAcompanharLocalizacao";
import { usePontoDaPessoa } from "@/features/localizacao/viewmodels/usePontoDaPessoa";
import type { PlanoFoco } from "@/features/postos/domain/foco";
import { useDetalheAberto } from "@/features/postos/viewmodels/useDetalheAberto";
import { useFolhaLista } from "@/features/postos/viewmodels/useFolhaLista";
import { useListaPostos } from "@/features/postos/viewmodels/useListaPostos";
import { useListaRecolhida } from "@/features/postos/viewmodels/useListaRecolhida";
import { usePostoAberto } from "@/features/postos/viewmodels/usePostoAberto";
import { usePostosNaArea } from "@/features/postos/viewmodels/usePostosNaArea";
import { useTelaCelular } from "@/features/postos/viewmodels/useTelaCelular";
import { useStatusFontes } from "@/features/status-fontes/viewmodels/useStatusFontes";
import { useTema } from "@/features/tema/viewmodels/useTema";
import type { DataISO } from "@/lib/formato";
import { BarraApp } from "./BarraApp";
import { BotaoLocalizacao } from "./BotaoLocalizacao";
import { BotaoTema } from "./BotaoTema";
import { MapaCarregavel } from "./MapaCarregavel";
import type { AreaMapa, CoberturaMapa, ControleMapa } from "./MapaPostos";

export type TelaMapaProps = {
  /** O "hoje" do servidor (`hojeParaRender`). */
  hoje: DataISO;
  centroInicial?: { lng: number; lat: number };
  /**
   * Detalhe do posto aberto pelo link direto (modo página, US2). Fica sempre à direita, como o
   * modal (D4): num cartão de vidro no computador e numa folha na metade da tela no celular (D9).
   * A lista continua à esquerda.
   */
  detalhe?: ReactNode;
};

// Espaço entre a lista flutuante e o mapa livre à direita dela.
const FOLGA_PAINEL = 16;

// A fração da tela que uma folha na metade cobre, no celular (a da lista e a do detalhe, D9).
const FRACAO_FOLHA_MEIA = 0.5;

// A troca entre o cartão da lista e a pílula, no computador (D8): opacidade, posição e escala numa
// curva que desacelera no fim, em 300 ms. A visibilidade não anima (duração 0): ao mostrar, ela vira
// "visible" na hora, e o elemento já pode receber o foco; ao esconder, `ESCONDER_DEPOIS` a adia
// para o fim, e o elemento só sai do Tab e do leitor de tela quando termina de sumir. Com menos
// movimento, a troca é instantânea.
const TRANSICAO_LISTA =
  "md:origin-top-left md:transition-[opacity,translate,scale,visibility] md:[transition-duration:300ms,300ms,300ms,0s] md:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";
const ESCONDER_DEPOIS = "md:[transition-delay:0s,0s,0s,300ms]";

// O cartão do detalhe do link direto, com a mesma forma do modal: folha na metade da tela no
// celular (D9) e cartão de vidro de 336 px à direita no computador. Fica no próprio HTML, sem
// portal (FR-013), por isso no celular não é arrastável: o conteúdo rola dentro dele.
const CARTAO_DETALHE =
  "absolute inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-[24px] max-md:h-[50dvh] max-md:bg-bg max-md:shadow-[0_-12px_32px_#1C19171A] md:glass md:inset-x-auto md:top-4 md:right-4 md:bottom-auto md:max-h-[calc(100%-32px)] md:w-[336px] md:rounded-[18px]";

/**
 * Composição cliente da tela do mapa, na forma da identidade visual (Paper: "04 Mapa · desktop ·
 * glass"):
 * - no celular (D9), o mapa livre, com uma barra compacta embaixo (contagem, "Ver lista" e busca),
 *   o botão de localização e a linha das fontes; a lista abre numa folha arrastável, na metade da
 *   tela ou em tela cheia, e a busca num campo no topo;
 * - a partir de `md`, o mapa ocupa a tela e a lista flutua num cartão de vidro de 336 px, que pode
 *   ser recolhido numa pílula (D6).
 * Os dados vêm só dos viewmodels (Princípio IV).
 */
export function TelaMapa({ hoje, centroInicial, detalhe }: TelaMapaProps) {
  const [area, setArea] = useState<AreaMapa | null>(null);
  const controleRef = useRef<ControleMapa | null>(null);
  const tituloListaRef = useRef<HTMLHeadingElement>(null);
  const tituloFolhaRef = useRef<HTMLHeadingElement>(null);
  const { tema } = useTema();
  const celular = useTelaCelular();

  // No computador, a lista pode ser recolhida numa pílula, e o mapa ganha a área toda (D6). O foco
  // vai para a pílula ao recolher e para o título da lista (ou para a busca) ao abrir.
  const idLista = useId();
  const pilulaRef = useRef<HTMLButtonElement>(null);
  const { recolhida, recolher, expandir } = useListaRecolhida();
  const recolherLista = () => {
    recolher();
    requestAnimationFrame(() => pilulaRef.current?.focus());
  };
  const expandirLista = (destino: "titulo" | "busca") => {
    expandir();
    requestAnimationFrame(() => {
      if (destino === "busca") painelRef.current?.querySelector<HTMLInputElement>("input")?.focus();
      else tituloListaRef.current?.focus();
    });
  };

  // No celular, a lista abre numa folha (D9). Abrir põe o foco no título dela; fechar devolve o foco
  // à pílula.
  const idFolha = useId();
  const pilulaCelularRef = useRef<HTMLButtonElement>(null);
  const folha = useFolhaLista();
  const abrirFolha = () => {
    folha.abrir();
    // A folha é montada num portal e sobe animada: espera dois quadros para pôr o foco no título.
    requestAnimationFrame(() => requestAnimationFrame(() => tituloFolhaRef.current?.focus()));
  };
  const fecharFolha = () => {
    folha.fechar();
    requestAnimationFrame(() => pilulaCelularRef.current?.focus());
  };

  // A busca do celular abre num campo no topo, com o foco nele, e fecha ao escolher a cidade.
  const [buscaAberta, setBuscaAberta] = useState(false);
  const buscaRef = useRef<HTMLDivElement>(null);
  const abrirBusca = () => {
    setBuscaAberta(true);
    requestAnimationFrame(() => buscaRef.current?.querySelector<HTMLInputElement>("input")?.focus());
  };
  const fecharBusca = () => {
    setBuscaAberta(false);
    requestAnimationFrame(() => pilulaCelularRef.current?.focus());
  };

  // Os painéis flutuam sobre o mapa: mede quanto dele cada um cobre, para a área visível (e a
  // contagem "N postos nesta área") ser só o que a pessoa vê.
  const painelRef = useRef<HTMLElement>(null);
  const barraRef = useRef<HTMLDivElement>(null);
  const [cobertura, setCobertura] = useState<CoberturaMapa>({ esquerda: 0, inferior: 0 });
  useEffect(() => {
    const medir = () => {
      const lista = painelRef.current;
      const barra = barraRef.current;
      // A lista só cobre o mapa quando flutua (computador); no celular ela fica numa folha.
      // Recolhida (D6), ela some e mede 0: a pílula no canto não conta como faixa coberta.
      const flutuante = lista !== null && lista.offsetWidth > 0 && getComputedStyle(lista).position === "absolute";
      const esquerda = flutuante ? Math.round(lista.offsetLeft + lista.offsetWidth + FOLGA_PAINEL) : 0;
      // A barra compacta do celular cobre o mapa da borda de baixo até o topo dela; no computador
      // ela some (display: none) e mede 0.
      const inferior = barra && barra.offsetHeight > 0 ? Math.round(window.innerHeight - barra.getBoundingClientRect().top) : 0;
      setCobertura((atual) => (atual.esquerda === esquerda && atual.inferior === inferior ? atual : { esquerda, inferior }));
    };
    const observador = new ResizeObserver(medir);
    if (painelRef.current) observador.observe(painelRef.current);
    if (barraRef.current) observador.observe(barraRef.current);
    window.addEventListener("resize", medir);
    medir();
    return () => {
      observador.disconnect();
      window.removeEventListener("resize", medir);
    };
  }, []);

  const pathname = usePathname();
  const detalheAberto = useDetalheAberto();
  const postoAberto = usePostoAberto();
  const postos = usePostosNaArea({
    bboxVisivel: area?.bboxVisivel ?? null,
    zoom: area?.zoom ?? 0,
    hoje,
    selecionado: postoAberto,
  });
  const lista = useListaPostos(postos.postosVisiveis, hoje);

  // No celular, uma folha na metade (a da lista, a do detalhe ou o cartão do link direto) cobre a
  // metade de baixo do mapa: a área visível e os enquadramentos descontam essa parte (D9). Com a
  // lista recolhida no computador, o cartão não cobre mais a esquerda (D6).
  const folhaNaMetade = celular && (folha.altura !== "fechada" || detalheAberto || Boolean(detalhe));
  const coberturaMapa = useMemo(
    () => ({
      esquerda: recolhida ? 0 : cobertura.esquerda,
      inferior: folhaNaMetade ? Math.round(window.innerHeight * FRACAO_FOLHA_MEIA) : cobertura.inferior,
    }),
    [cobertura, recolhida, folhaNaMetade],
  );

  // Ao abrir um posto pela lista ou pelo mapa, guarda o item de origem; quando o detalhe fecha e a
  // rota volta para onde estava, o foco volta para ele (US2, cenário 6; FR-031). Trocar de posto
  // com o detalhe aberto mantém a rota de antes do primeiro posto, porque "Fechar" volta direto
  // para ela (D1), e o foco vai para o último item escolhido.
  // Escolher um posto na lista também leva o mapa até ele (D5).
  const origemRef = useRef<{ elemento: HTMLElement; cnpj: string; rota: string } | null>(null);
  const lembrarOrigem = (evento: MouseEvent<HTMLDivElement>) => {
    const alvo = evento.target instanceof Element ? evento.target.closest<HTMLElement>("[data-cnpj]") : null;
    const cnpj = alvo?.dataset.cnpj;
    if (!alvo || !cnpj) return;
    const rota = detalheAberto && origemRef.current ? origemRef.current.rota : pathname;
    origemRef.current = { elemento: alvo, cnpj, rota };
    if (alvo.closest("[data-lista-postos]")) {
      const plano = postos.focoDoPosto(cnpj);
      if (plano) controleRef.current?.focarPosto(plano);
    }
  };
  useEffect(() => {
    const origem = origemRef.current;
    if (!origem || origem.rota !== pathname) return;
    origemRef.current = null;
    // Com o mapa movido até o posto, a lista acompanha a nova área e o item de origem pode ter
    // saído dela (no celular, a folha da lista fecha quando o detalhe abre). Aí o foco vai para o
    // marcador do posto ou, sem ele, para o título da lista.
    const destino = origem.elemento.isConnected
      ? origem.elemento
      : (document.querySelector<HTMLElement>(`[data-cnpj="${origem.cnpj}"]`) ?? (celular ? pilulaCelularRef.current : tituloListaRef.current));
    destino?.focus();
  }, [pathname, celular]);

  // No celular, abrir um posto fecha a folha da lista (o detalhe toma o lugar dela) e leva o mapa
  // até o posto, acima da folha do detalhe (D9, decisão 4).
  const focoDoPostoRef = useRef<(cnpj: string) => PlanoFoco | null>(postos.focoDoPosto);
  useEffect(() => {
    focoDoPostoRef.current = postos.focoDoPosto;
  });
  const { fechar: fecharFolhaSemFoco } = folha;
  useEffect(() => {
    if (!celular || !detalheAberto || !postoAberto) return;
    fecharFolhaSemFoco();
    const plano = focoDoPostoRef.current(postoAberto);
    if (plano) controleRef.current?.focarPosto(plano);
  }, [celular, detalheAberto, postoAberto, fecharFolhaSemFoco]);

  const { precosAtualizadosEm } = useStatusFontes();

  // Buscar uma cidade ou usar a localização move o mapa. No celular, com a lista em tela cheia, ela
  // baixa para a metade, para o mapa aparecer.
  const { baixarParaMetade } = folha;
  const centralizarEmLimites = useCallback(
    (limites: Limites) => {
      baixarParaMetade();
      requestAnimationFrame(() => controleRef.current?.centralizarEmLimites(limites));
    },
    [baixarParaMetade],
  );
  const centralizarEm = useCallback(
    (lng: number, lat: number) => {
      baixarParaMetade();
      requestAnimationFrame(() => controleRef.current?.centralizarEm(lng, lat));
    },
    [baixarParaMetade],
  );
  const verRegiaoInteira = useCallback(() => centralizarEmLimites(REGIAO_PADRAO), [centralizarEmLimites]);

  // "Usar minha localização" (D7): um acompanhamento só, compartilhado pelos dois botões (celular
  // e computador). A posição fica na memória da página e só vira o ponto no mapa.
  const localizacao = useAcompanharLocalizacao(centralizarEm);
  const pontoPessoa = usePontoDaPessoa(localizacao.posicao, area?.zoom ?? 0);

  // A mesma lista, no cartão do computador e na folha do celular: só uma aparece por vez.
  const propsLista = {
    titulo: lista.titulo,
    grupos: lista.grupos,
    vazia: lista.vazia,
    sentido: lista.sentido,
    onDefinirSentido: lista.definirSentido,
    estado: postos.estado,
    onTentarDeNovo: postos.tentarDeNovo,
    onVerRegiaoInteira: verRegiaoInteira,
    regua: lista.regua,
    substituirHistorico: detalheAberto,
    mostrarMais: lista.mostrarMais,
    busca: <BuscaCidade variante="painel" aoSelecionar={centralizarEmLimites} />,
  };

  return (
    <div onClickCapture={lembrarOrigem} className="relative flex min-h-0 flex-1 flex-col">
      <h1 className="sr-only">Gasosinha: preço da gasolina comum nos postos da Região Metropolitana do Recife</h1>

      <aside
        ref={painelRef}
        id={idLista}
        aria-label="Postos da área visível"
        data-lista-postos=""
        className={cn(
          // Só no computador: um cartão de vidro sobre o mapa, com altura pelo conteúdo e espaço
          // embaixo para os controles do mapa. O cartão corta nas pontas arredondadas, e quem rola é
          // o filho. No celular, a lista fica na folha (D9).
          "hidden min-h-0 flex-col md:glass md:absolute md:top-4 md:left-4 md:z-20 md:flex md:max-h-[min(680px,calc(100%-92px))] md:w-[336px] md:flex-none md:overflow-hidden md:rounded-[18px]",
          // Recolher e abrir são suaves (D8): o cartão encolhe para o canto e some, sem sair da
          // página; recolhido, ele fica invisível (fora do Tab e do leitor de tela) e não recebe cliques.
          TRANSICAO_LISTA,
          recolhida && cn("md:pointer-events-none md:invisible md:-translate-x-3 md:scale-95 md:opacity-0", ESCONDER_DEPOIS),
        )}
      >
        <div className="rolagem-fina flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-initial">
          <BarraApp variante="painel" className="flex" acao={<BotaoRecolherLista controla={idLista} onRecolher={recolherLista} />} />
          <ListaPostos {...propsLista} tituloRef={tituloListaRef} />
        </div>
      </aside>

      <section aria-label="Mapa dos postos" className="relative flex min-h-0 flex-1 flex-col">
        {/* O mapa vai até o fim da tela e passa por baixo da barra e das folhas; a área visível as desconta. */}
        <div className="relative min-h-0 flex-1">
          <MapaCarregavel
            marcadores={postos.marcadores}
            grupos={postos.grupos}
            aoMudarArea={setArea}
            centroInicial={centroInicial}
            controleRef={controleRef}
            escuro={tema === "escuro"}
            cobertura={coberturaMapa}
            substituirHistorico={detalheAberto}
            pontoPessoa={pontoPessoa}
            seguirPessoa={localizacao.seguindo}
            aoArrastarMapa={localizacao.deixarDeSeguir}
            controles={
              <>
                <BotaoTema variante="quadrado" />
                <BotaoLocalizacao variante="pilula" estado={localizacao} onUsar={localizacao.ativar} />
                <AtribuicaoFontes variante="pilula" atualizadoEm={precosAtualizadosEm} />
              </>
            }
          />
        </div>

        {/* Celular (D9): a barra compacta embaixo, com a linha das fontes e, na mesma linha da
            pílula, o botão de localização, perto do polegar. */}
        <div
          ref={barraRef}
          className="absolute inset-x-4 bottom-[max(env(safe-area-inset-bottom),12px)] z-20 flex flex-col gap-2 md:hidden"
        >
          <AtribuicaoFontes variante="linha" atualizadoEm={precosAtualizadosEm} />
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <PilulaCelular
                titulo={lista.tituloCurto}
                estado={postos.estado}
                vazia={lista.vazia}
                aberta={folha.altura !== "fechada"}
                controla={idFolha}
                abrirRef={pilulaCelularRef}
                onAbrir={abrirFolha}
                onBuscar={abrirBusca}
                onTentarDeNovo={postos.tentarDeNovo}
                onVerRegiaoInteira={verRegiaoInteira}
              />
            </div>
            <BotaoLocalizacao variante="redondo" estado={localizacao} onUsar={localizacao.ativar} />
          </div>
        </div>

        {buscaAberta && (
          <div
            ref={buscaRef}
            className="absolute inset-x-4 top-3 z-30 flex items-start gap-2 md:hidden"
            onKeyDown={(evento: KeyboardEvent<HTMLDivElement>) => {
              if (evento.key === "Escape") fecharBusca();
            }}
          >
            <div className="min-w-0 flex-1">
              <BuscaCidade
                variante="flutuante"
                aoSelecionar={(limites) => {
                  setBuscaAberta(false);
                  centralizarEmLimites(limites);
                }}
              />
            </div>
            <button
              type="button"
              onClick={fecharBusca}
              className="flex h-12 shrink-0 cursor-pointer items-center rounded-[14px] bg-float px-3.5 text-sm font-semibold text-ink shadow-[0_0_0_1px_var(--pin-ring),0_6px_16px_#1C19171A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Cancelar
            </button>
          </div>
        )}
      </section>

      {/* A pílula fica sempre montada e aparece logo depois de o cartão começar a sumir (D8). */}
      <div
        className={cn(
          "absolute top-4 left-4 z-20 hidden md:block",
          TRANSICAO_LISTA,
          recolhida
            ? // O atraso vale para a opacidade, a posição e a escala, não para a visibilidade: a pílula
              // já pode receber o foco no instante em que a lista recolhe.
              "md:[transition-delay:120ms,120ms,120ms,0s]"
            : cn("md:pointer-events-none md:invisible md:-translate-x-2 md:scale-95 md:opacity-0", ESCONDER_DEPOIS),
        )}
      >
        <PilulaLista
          titulo={lista.titulo}
          controla={idLista}
          expandirRef={pilulaRef}
          onExpandir={() => expandirLista("titulo")}
          onBuscar={() => expandirLista("busca")}
        />
      </div>

      {/* Celular (D9): a lista numa folha arrastável, na metade da tela ou em tela cheia. */}
      {celular && (
        <FolhaLista
          id={idFolha}
          altura={folha.altura}
          onMudarAltura={folha.definirAltura}
          onFechar={fecharFolha}
          cabecalho={
            <div className="flex items-center gap-3">
              <Logotipo className="text-lg" />
              <BotaoTema variante="redondo" />
            </div>
          }
        >
          <div data-lista-postos="">
            <ListaPostos {...propsLista} tituloRef={tituloFolhaRef} />
            <AtribuicaoFontes atualizadoEm={precosAtualizadosEm} className="px-5 pt-6 pb-4" />
          </div>
        </FolhaLista>
      )}

      {detalhe && (
        // Com o modal de outro posto aberto por cima, este cartão se esconde para não haver dois; ele
        // volta quando o modal fecha.
        <div className={cn(CARTAO_DETALHE, detalheAberto && "hidden")}>
          <div className="rolagem-fina min-h-0 overflow-y-auto">{detalhe}</div>
        </div>
      )}
    </div>
  );
}
