"use client";

import { setWorkerUrl, type Map as MapaMapLibre } from "maplibre-gl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactNode, type RefObject } from "react";
import { Map as Mapa, Marker, type MapRef } from "react-map-gl/maplibre";
import { IconeMais, IconeMenos } from "@/components/marca/Icones";
import { REGIAO_PADRAO, type Limites } from "@/features/busca/data/municipios-rmr";
import type { Bbox } from "@/features/postos/domain/tipos";
import type { GrupoVM, MarcadorVM } from "@/features/postos/viewmodels/tipos";
import { MarcadorGrupo } from "./MarcadorGrupo";
import { MarcadorPosto } from "./MarcadorPosto";

/** Comandos que a tela pede ao mapa: centralizar numa cidade (busca) ou num ponto (localização). */
export type ControleMapa = {
  centralizarEmLimites: (limites: Limites) => void;
  centralizarEm: (lng: number, lat: number) => void;
};

export type AreaMapa = { bboxVisivel: Bbox; zoom: number };

/**
 * Quanto do mapa, em px, fica atrás dos painéis que flutuam sobre ele: a lista à esquerda
 * (computador) e a folha de resumo embaixo (celular). A área visível e os enquadramentos
 * descontam essa parte, para a lista mostrar só o que a pessoa vê.
 */
export type CoberturaMapa = { esquerda: number; inferior: number };

const SEM_COBERTURA: CoberturaMapa = { esquerda: 0, inferior: 0 };

export type MapaPostosProps = {
  marcadores: MarcadorVM[];
  grupos: GrupoVM[];
  aoMudarArea: (area: AreaMapa) => void;
  /** Sem ela, o mapa abre na RMR inteira (FR-002). */
  centroInicial?: { lng: number; lat: number };
  controleRef: RefObject<ControleMapa | null>;
  /** Controles no canto inferior esquerdo (computador): tema, localização e atribuição. */
  controles?: ReactNode;
  /** Mapa base no estilo escuro (tema escuro). */
  escuro?: boolean;
  cobertura?: CoberturaMapa;
  /** Com o detalhe de um posto aberto, tocar em outro troca o detalhe sem empilhar o histórico (D1). */
  substituirHistorico?: boolean;
};

// O MapLibre 6 procura o worker ao lado do próprio arquivo (`./maplibre-gl-worker.mjs`), caminho
// que deixa de existir depois do bundle. O `new URL(..., import.meta.url)` faz o bundler publicar o
// arquivo do worker (autocontido, sem imports) e devolver a URL dele.
setWorkerUrl(new URL("../../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

// Os dois estilos são do OpenFreeMap, com os mesmos tiles e a mesma atribuição (R5).
const ESTILO = "https://tiles.openfreemap.org/styles/positron";
const ESTILO_ESCURO = "https://tiles.openfreemap.org/styles/dark";
const MARGEM_PAN = 0.3;
const LIMITES_PAN: [number, number, number, number] = [
  REGIAO_PADRAO[0] - MARGEM_PAN,
  REGIAO_PADRAO[1] - MARGEM_PAN,
  REGIAO_PADRAO[2] + MARGEM_PAN,
  REGIAO_PADRAO[3] + MARGEM_PAN,
];
const ZOOM_PONTO = 15;
const ZOOM_MAXIMO_GRUPO = 18;

const BOTAO_ZOOM =
  "flex size-11 cursor-pointer items-center justify-center text-ink hover:bg-glass-fill focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink";

// Até o celular medir a folha de resumo, o primeiro enquadramento usa a altura típica dela.
const ALTURA_TIPICA_FOLHA = 300;
// Abaixo disso de mapa livre, a cobertura é ignorada e vale o mapa inteiro.
const MAPA_LIVRE_MINIMO = 120;

type Margens = { top: number; bottom: number; left: number; right: number };

/**
 * Margens para enquadrar a região e as cidades fora do que fica coberto: no celular, a busca
 * flutuante em cima e a folha de resumo embaixo; no computador, a lista flutuante à esquerda e os
 * controles no canto inferior.
 */
function margensDoMapa({ esquerda, inferior }: CoberturaMapa): Margens {
  const celular = window.matchMedia("(max-width: 767px)").matches;
  return celular
    ? { top: 72, bottom: 40 + (inferior || ALTURA_TIPICA_FOLHA), left: 16, right: 16 }
    : { top: 32, bottom: 96, left: 32 + esquerda, right: 32 };
}

/**
 * A área que a pessoa vê: o mapa menos o que está atrás dos painéis (cantos desprojetados). Com o
 * mapa escondido (a lista no lugar dele, no celular) o contêiner mede 0 e os cantos viram um ponto
 * só: aí não há área nova, e a lista continua com a última que a pessoa viu.
 */
function areaDe(mapa: MapaMapLibre, { esquerda, inferior }: CoberturaMapa): AreaMapa | null {
  const { clientWidth: largura, clientHeight: altura } = mapa.getContainer();
  if (largura === 0 || altura === 0) return null;
  const x0 = largura - esquerda >= MAPA_LIVRE_MINIMO ? esquerda : 0;
  const y1 = altura - inferior >= MAPA_LIVRE_MINIMO ? altura - inferior : altura;
  // Os quatro cantos, porque o mapa pode girar com dois dedos no celular.
  const cantos = (
    [
      [x0, 0],
      [largura, 0],
      [x0, y1],
      [largura, y1],
    ] as const
  ).map(([x, y]) => mapa.unproject([x, y]));
  const lngs = cantos.map((c) => c.lng);
  const lats = cantos.map((c) => c.lat);
  return {
    bboxVisivel: [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)],
    zoom: mapa.getZoom(),
  };
}

/**
 * Mapa da RMR com os postos (FR-001, FR-002, FR-007 a FR-009). Os marcadores são elementos DOM
 * acessíveis (R12). Só recebe dados prontos dos viewmodels; a cada parada do mapa, informa a área
 * visível (nunca a posição da pessoa, Princípio III).
 */
export function MapaPostos({
  marcadores,
  grupos,
  aoMudarArea,
  centroInicial,
  controleRef,
  controles,
  escuro = false,
  cobertura = SEM_COBERTURA,
  substituirHistorico = false,
}: MapaPostosProps) {
  const mapaRef = useRef<MapRef>(null);
  const carregouRef = useRef(false);
  const [erroMapa, setErroMapa] = useState(false);
  // O mapa só existe no navegador (carregado sem SSR), então a largura da tela já é conhecida aqui.
  const [margensIniciais] = useState(() => margensDoMapa(cobertura));
  const router = useRouter();
  // Os comandos e eventos do mapa leem sempre a cobertura mais recente.
  const coberturaRef = useRef(cobertura);
  useEffect(() => {
    coberturaRef.current = cobertura;
  }, [cobertura]);

  useImperativeHandle(
    controleRef,
    () => ({
      centralizarEmLimites: ([oeste, sul, leste, norte]) => {
        const mapa = mapaRef.current;
        if (!mapa) return;
        mapa.resize(); // o mapa pode ter acabado de aparecer (troca de lista para mapa no celular)
        mapa.fitBounds(
          [
            [oeste, sul],
            [leste, norte],
          ],
          { padding: margensDoMapa(coberturaRef.current) },
        );
      },
      centralizarEm: (lng, lat) => {
        const mapa = mapaRef.current;
        if (!mapa) return;
        mapa.resize();
        mapa.flyTo({ center: [lng, lat], zoom: ZOOM_PONTO, padding: margensDoMapa(coberturaRef.current) });
      },
    }),
    [],
  );

  const informarArea = useCallback(
    (mapa: MapaMapLibre, cobertura: CoberturaMapa = coberturaRef.current) => {
      const area = areaDe(mapa, cobertura);
      if (area) aoMudarArea(area);
    },
    [aoMudarArea],
  );

  // Quando um painel muda de tamanho (a folha cresce, a lista aparece), a área visível muda junto.
  const { esquerda, inferior } = cobertura;
  useEffect(() => {
    const mapa = mapaRef.current?.getMap();
    if (carregouRef.current && mapa) informarArea(mapa, { esquerda, inferior });
  }, [esquerda, inferior, informarArea]);

  return (
    <div className="absolute inset-0">
      <Mapa
        ref={mapaRef}
        mapStyle={escuro ? ESTILO_ESCURO : ESTILO}
        initialViewState={
          centroInicial
            ? { longitude: centroInicial.lng, latitude: centroInicial.lat, zoom: ZOOM_PONTO }
            : { bounds: [REGIAO_PADRAO[0], REGIAO_PADRAO[1], REGIAO_PADRAO[2], REGIAO_PADRAO[3]], fitBoundsOptions: { padding: margensIniciais } }
        }
        maxBounds={LIMITES_PAN}
        dragRotate={false}
        pitchWithRotate={false}
        touchPitch={false}
        // A atribuição do mapa base está na nossa AtribuicaoFontes, sempre visível (FR-030).
        attributionControl={false}
        style={{ width: "100%", height: "100%" }}
        onLoad={(e) => {
          carregouRef.current = true;
          informarArea(e.target);
        }}
        onMoveEnd={(e) => informarArea(e.target)}
        onError={() => {
          // Só a falha antes de carregar (o estilo) impede o uso do mapa; um tile perdido depois não.
          if (!carregouRef.current) setErroMapa(true);
        }}
      >
        {grupos.map((grupo) => (
          <Marker key={`grupo-${grupo.id}`} longitude={grupo.lng} latitude={grupo.lat}>
            <MarcadorGrupo
              quantidade={grupo.quantidade}
              onAproximar={() =>
                mapaRef.current?.flyTo({ center: [grupo.lng, grupo.lat], zoom: Math.min(grupo.zoomExpansao, ZOOM_MAXIMO_GRUPO) })
              }
            />
          </Marker>
        ))}
        {marcadores.map((marcador) => (
          // A pílula com preço tem uma ponta embaixo, que aponta para o posto; "sem preço" fica centralizado.
          <Marker key={marcador.cnpj} longitude={marcador.lng} latitude={marcador.lat} anchor={marcador.semPreco ? "center" : "bottom"}>
            <MarcadorPosto
              vm={marcador}
              onSelecionar={() => {
                const rota = `/postos/${marcador.cnpj}`;
                // Com um detalhe aberto, troca de posto sem empilhar o histórico (D1).
                if (substituirHistorico) router.replace(rota);
                else router.push(rota);
              }}
            />
          </Marker>
        ))}
      </Mapa>

      {erroMapa && (
        <div className="pointer-events-none absolute inset-x-0 top-20 flex justify-center px-4 md:top-6">
          <p role="alert" className="rounded-[12px] bg-ink px-4 py-2.5 text-sm text-bg shadow-[0_6px_16px_#1C19171F]">
            Não foi possível carregar o mapa. Use a lista.
          </p>
        </div>
      )}

      {/* Computador: tema, localização e atribuição embaixo à esquerda; zoom embaixo à direita. */}
      <div className="pointer-events-none absolute bottom-4 left-4 hidden items-end gap-2.5 md:flex">
        <div className="pointer-events-auto flex items-end gap-2.5">{controles}</div>
      </div>
      <div className="glass absolute right-4 bottom-4 hidden flex-col overflow-hidden rounded-[12px] md:flex">
        <button type="button" aria-label="Aproximar o mapa" onClick={() => mapaRef.current?.zoomIn()} className={`${BOTAO_ZOOM} border-b border-line`}>
          <IconeMais className="size-4" />
        </button>
        <button type="button" aria-label="Afastar o mapa" onClick={() => mapaRef.current?.zoomOut()} className={BOTAO_ZOOM}>
          <IconeMenos className="size-4" />
        </button>
      </div>
    </div>
  );
}
