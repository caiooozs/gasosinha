"use client";

import { setWorkerUrl, type Map as MapaMapLibre } from "maplibre-gl";
import { useRouter } from "next/navigation";
import { useCallback, useImperativeHandle, useRef, useState, type ReactNode, type RefObject } from "react";
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

export type MapaPostosProps = {
  marcadores: MarcadorVM[];
  grupos: GrupoVM[];
  aoMudarArea: (area: AreaMapa) => void;
  /** Sem ela, o mapa abre na RMR inteira (FR-002). */
  centroInicial?: { lng: number; lat: number };
  controleRef: RefObject<ControleMapa | null>;
  /** Controles ao lado do zoom, no canto inferior esquerdo (computador): localização e atribuição. */
  controles?: ReactNode;
};

// O MapLibre 6 procura o worker ao lado do próprio arquivo (`./maplibre-gl-worker.mjs`), caminho
// que deixa de existir depois do bundle. O `new URL(..., import.meta.url)` faz o bundler publicar o
// arquivo do worker (autocontido, sem imports) e devolver a URL dele.
setWorkerUrl(new URL("../../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

const ESTILO = "https://tiles.openfreemap.org/styles/positron";
const MARGEM_PAN = 0.3;
const LIMITES_PAN: [number, number, number, number] = [
  REGIAO_PADRAO[0] - MARGEM_PAN,
  REGIAO_PADRAO[1] - MARGEM_PAN,
  REGIAO_PADRAO[2] + MARGEM_PAN,
  REGIAO_PADRAO[3] + MARGEM_PAN,
];
const ZOOM_PONTO = 15;
const ZOOM_MAXIMO_GRUPO = 18;

const CARTAO = "bg-white shadow-[0_0_0_1px_#1C191714,0_6px_16px_#1C19171A]";
const BOTAO_ZOOM =
  "flex size-11 cursor-pointer items-center justify-center text-ink hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink";

type Margens = { top: number; bottom: number; left: number; right: number };

/**
 * Margens para enquadrar a região e as cidades fora do que cobre o mapa: no celular, a busca
 * flutuante em cima e os cantos da folha de resumo embaixo (o mapa termina onde a folha começa);
 * no computador, os controles no canto inferior.
 */
function margensDoMapa(): Margens {
  const celular = window.matchMedia("(max-width: 767px)").matches;
  return celular ? { top: 72, bottom: 40, left: 16, right: 16 } : { top: 32, bottom: 96, left: 32, right: 32 };
}

function areaDe(mapa: MapaMapLibre): AreaMapa {
  const b = mapa.getBounds();
  return { bboxVisivel: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], zoom: mapa.getZoom() };
}

/**
 * Mapa da RMR com os postos (FR-001, FR-002, FR-007 a FR-009). Os marcadores são elementos DOM
 * acessíveis (R12). Só recebe dados prontos dos viewmodels; a cada parada do mapa, informa a área
 * visível (nunca a posição da pessoa, Princípio III).
 */
export function MapaPostos({ marcadores, grupos, aoMudarArea, centroInicial, controleRef, controles }: MapaPostosProps) {
  const mapaRef = useRef<MapRef>(null);
  const carregouRef = useRef(false);
  const [erroMapa, setErroMapa] = useState(false);
  // O mapa só existe no navegador (carregado sem SSR), então a largura da tela já é conhecida aqui.
  const [margensIniciais] = useState(margensDoMapa);
  const router = useRouter();

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
          { padding: margensDoMapa() },
        );
      },
      centralizarEm: (lng, lat) => {
        const mapa = mapaRef.current;
        if (!mapa) return;
        mapa.resize();
        mapa.flyTo({ center: [lng, lat], zoom: ZOOM_PONTO, padding: margensDoMapa() });
      },
    }),
    [],
  );

  const informarArea = useCallback((mapa: MapaMapLibre) => aoMudarArea(areaDe(mapa)), [aoMudarArea]);

  return (
    <div className="absolute inset-0">
      <Mapa
        ref={mapaRef}
        mapStyle={ESTILO}
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
            <MarcadorPosto vm={marcador} onSelecionar={() => router.push(`/postos/${marcador.cnpj}`)} />
          </Marker>
        ))}
      </Mapa>

      {erroMapa && (
        <div className="pointer-events-none absolute inset-x-0 top-20 flex justify-center px-4 md:top-6">
          <p role="alert" className="rounded-[12px] bg-ink px-4 py-2.5 text-sm text-white shadow-[0_6px_16px_#1C19171F]">
            Não foi possível carregar o mapa. Use a lista.
          </p>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-6 left-6 hidden items-end gap-3 md:flex">
        <div className={`pointer-events-auto flex flex-col overflow-hidden rounded-[12px] ${CARTAO}`}>
          <button type="button" aria-label="Aproximar o mapa" onClick={() => mapaRef.current?.zoomIn()} className={`${BOTAO_ZOOM} border-b border-line`}>
            <IconeMais className="size-4" />
          </button>
          <button type="button" aria-label="Afastar o mapa" onClick={() => mapaRef.current?.zoomOut()} className={BOTAO_ZOOM}>
            <IconeMenos className="size-4" />
          </button>
        </div>
        <div className="pointer-events-auto flex items-end gap-3">{controles}</div>
      </div>
    </div>
  );
}
