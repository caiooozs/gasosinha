"use client";

import { setWorkerUrl, type Map as MapaMapLibre } from "maplibre-gl";
import { useRouter } from "next/navigation";
import { useCallback, useImperativeHandle, useRef, useState, type RefObject } from "react";
import { Map as Mapa, Marker, type MapRef } from "react-map-gl/maplibre";
import { Button } from "@/components/ui/button";
import { REGIAO_PADRAO, type Limites } from "@/features/busca/data/municipios-rmr";
import type { Bbox } from "@/features/postos/domain/tipos";
import type { EstadoCarga, GrupoVM, MarcadorVM } from "@/features/postos/viewmodels/tipos";
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
  estado: EstadoCarga;
  tentarDeNovo: () => void;
  aoMudarArea: (area: AreaMapa) => void;
  /** Sem ela, o mapa abre na RMR inteira (FR-002). */
  centroInicial?: { lng: number; lat: number };
  controleRef: RefObject<ControleMapa | null>;
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

function areaDe(mapa: MapaMapLibre): AreaMapa {
  const b = mapa.getBounds();
  return { bboxVisivel: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], zoom: mapa.getZoom() };
}

/**
 * Mapa da RMR com os postos (FR-001, FR-002, FR-007 a FR-009). Os marcadores são elementos DOM
 * acessíveis (R12). Só recebe dados prontos dos viewmodels; a cada parada do mapa, informa a área
 * visível (nunca a posição da pessoa, Princípio III).
 */
export function MapaPostos({ marcadores, grupos, estado, tentarDeNovo, aoMudarArea, centroInicial, controleRef }: MapaPostosProps) {
  const mapaRef = useRef<MapRef>(null);
  const carregouRef = useRef(false);
  const [erroMapa, setErroMapa] = useState(false);
  const router = useRouter();

  useImperativeHandle(
    controleRef,
    () => ({
      centralizarEmLimites: ([oeste, sul, leste, norte]) => {
        const mapa = mapaRef.current;
        if (!mapa) return;
        mapa.resize(); // o mapa pode ter acabado de aparecer (aba "Mapa" no celular)
        mapa.fitBounds(
          [
            [oeste, sul],
            [leste, norte],
          ],
          { padding: 24 },
        );
      },
      centralizarEm: (lng, lat) => {
        const mapa = mapaRef.current;
        if (!mapa) return;
        mapa.resize();
        mapa.flyTo({ center: [lng, lat], zoom: ZOOM_PONTO });
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
            : { bounds: [REGIAO_PADRAO[0], REGIAO_PADRAO[1], REGIAO_PADRAO[2], REGIAO_PADRAO[3]], fitBoundsOptions: { padding: 16 } }
        }
        maxBounds={LIMITES_PAN}
        dragRotate={false}
        pitchWithRotate={false}
        touchPitch={false}
        attributionControl={{ compact: true }}
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
          <Marker key={marcador.cnpj} longitude={marcador.lng} latitude={marcador.lat}>
            <MarcadorPosto vm={marcador} onSelecionar={() => router.push(`/postos/${marcador.cnpj}`)} />
          </Marker>
        ))}
      </Mapa>

      <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-3">
        {erroMapa ? (
          <p role="alert" className="pointer-events-auto rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-950 shadow">
            Não foi possível carregar o mapa. Use a lista.
          </p>
        ) : estado === "carregando" ? (
          <p role="status" className="rounded-full bg-white/95 px-3 py-1 text-sm text-neutral-800 shadow">
            Carregando postos…
          </p>
        ) : estado === "erro" ? (
          <div
            role="alert"
            className="pointer-events-auto flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-950 shadow"
          >
            <p>Não foi possível carregar os postos.</p>
            <Button type="button" size="sm" onClick={tentarDeNovo}>
              Tentar de novo
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
