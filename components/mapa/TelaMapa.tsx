"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { AtribuicaoFontes } from "@/components/avisos/AtribuicaoFontes";
import { BuscaCidade } from "@/components/busca/BuscaCidade";
import { ListaPostos } from "@/components/lista/ListaPostos";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Limites } from "@/features/busca/data/municipios-rmr";
import { useListaPostos } from "@/features/postos/viewmodels/useListaPostos";
import { usePostosNaArea } from "@/features/postos/viewmodels/usePostosNaArea";
import type { DataISO } from "@/lib/formato";
import { BotaoLocalizacao } from "./BotaoLocalizacao";
import { MapaCarregavel } from "./MapaCarregavel";
import type { AreaMapa, ControleMapa } from "./MapaPostos";

export type TelaMapaProps = {
  /** O "hoje" do servidor (`hojeParaRender`). */
  hoje: DataISO;
  centroInicial?: { lng: number; lat: number };
  /** Detalhe do posto (US2): quando é passado, ocupa o lugar da lista. */
  painel?: ReactNode;
};

type Aba = "mapa" | "lista";

/**
 * Composição cliente da tela do mapa (contracts/ui.md). No celular, busca no topo, mapa em tela
 * cheia e a alternância "Mapa | Lista"; a partir de `md`, painel lateral de 360 px e mapa à
 * direita. Os dados vêm só dos viewmodels (Princípio IV).
 */
export function TelaMapa({ hoje, centroInicial, painel }: TelaMapaProps) {
  const [area, setArea] = useState<AreaMapa | null>(null);
  const [aba, setAba] = useState<Aba>("mapa");
  const controleRef = useRef<ControleMapa | null>(null);

  const postos = usePostosNaArea({ bboxVisivel: area?.bboxVisivel ?? null, zoom: area?.zoom ?? 0, hoje });
  const lista = useListaPostos(postos.postosVisiveis, hoje);

  // No celular, o mapa pode estar escondido atrás da aba "Lista": mostra a aba e só então move o mapa.
  const centralizarEmLimites = useCallback((limites: Limites) => {
    setAba("mapa");
    requestAnimationFrame(() => controleRef.current?.centralizarEmLimites(limites));
  }, []);
  const centralizarEm = useCallback((lng: number, lat: number) => {
    setAba("mapa");
    requestAnimationFrame(() => controleRef.current?.centralizarEm(lng, lat));
  }, []);

  const mapa = (
    <MapaCarregavel
      marcadores={postos.marcadores}
      grupos={postos.grupos}
      estado={postos.estado}
      tentarDeNovo={postos.tentarDeNovo}
      aoMudarArea={setArea}
      centroInicial={centroInicial}
      controleRef={controleRef}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h1 className="sr-only">Gasosinha: preço da gasolina comum nos postos da Região Metropolitana do Recife</h1>

      <header className="flex flex-col gap-3 border-b bg-background px-4 py-3 md:flex-row md:items-start md:gap-6">
        <p aria-hidden="true" className="text-lg leading-none font-bold tracking-tight md:pt-6">
          Gasosinha
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start md:max-w-2xl md:flex-1">
          <div className="sm:flex-1">
            <BuscaCidade aoSelecionar={centralizarEmLimites} />
          </div>
          <div className="sm:pt-5">
            <BotaoLocalizacao aoCentralizar={centralizarEm} />
          </div>
        </div>
      </header>

      {painel ? (
        <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[360px_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)]">
          <section className="max-h-[55dvh] overflow-y-auto border-b p-4 md:max-h-none md:border-r md:border-b-0">{painel}</section>
          <div className="relative min-h-[45dvh] flex-1 md:min-h-0">{mapa}</div>
        </div>
      ) : (
        <Tabs
          value={aba}
          onValueChange={(valor) => setAba(valor === "lista" ? "lista" : "mapa")}
          className="min-h-0 flex-1 gap-0 md:grid md:grid-cols-[360px_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)]"
        >
          <TabsList className="mx-4 my-2 grid w-auto grid-cols-2 md:hidden">
            <TabsTrigger value="mapa">Mapa</TabsTrigger>
            <TabsTrigger value="lista">Lista</TabsTrigger>
          </TabsList>
          {/* As duas abas ficam montadas: o mapa não recarrega ao trocar, e no computador aparecem lado a lado. */}
          <TabsContent
            value="lista"
            forceMount
            className="min-h-0 overflow-y-auto p-4 data-[state=inactive]:hidden md:border-r md:data-[state=inactive]:block"
          >
            <ListaPostos
              grupos={lista.grupos}
              vazia={lista.vazia}
              sentido={lista.sentido}
              onAlternarSentido={lista.alternarSentido}
              estado={postos.estado}
              onTentarDeNovo={postos.tentarDeNovo}
            />
          </TabsContent>
          <TabsContent value="mapa" forceMount className="relative min-h-0 data-[state=inactive]:hidden md:data-[state=inactive]:block">
            {mapa}
          </TabsContent>
        </Tabs>
      )}

      <footer className="border-t bg-background px-4 py-2">
        <AtribuicaoFontes />
      </footer>
    </div>
  );
}
