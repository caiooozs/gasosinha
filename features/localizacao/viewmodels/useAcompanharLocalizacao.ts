"use client";

import { useEffect, useRef, useState } from "react";
import { dentroDaRmr } from "@/supabase/functions/_shared/regiao-rmr";

export type ResultadoLocalizacao = "centralizado" | "negado" | "indisponivel" | "fora_da_regiao";

/** A posição da pessoa e a margem de erro, em metros, informada pelo aparelho. */
export type PosicaoPessoa = { lat: number; lng: number; precisao: number };

export type EstadoLocalizacao = {
  /** Só na memória da página; `null` sem acompanhamento ligado. */
  posicao: PosicaoPessoa | null;
  /** O mapa segue a pessoa (até ela arrastá-lo). */
  seguindo: boolean;
  /** Esperando a primeira posição depois do pedido. */
  pedindo: boolean;
  resultado: ResultadoLocalizacao | null;
};

/** Para acompanhar quem se move: alta precisão e posições de até 5 s atrás. */
const OPCOES: PositionOptions = { enableHighAccuracy: true, timeout: 15_000, maximumAge: 5_000 };

const PARADO: EstadoLocalizacao = { posicao: null, seguindo: false, pedindo: false, resultado: null };

/**
 * "Usar minha localização" com o ponto de "você está aqui" (FR-003 a FR-005, D7; constituição
 * v1.2.0, Princípio III):
 * - nada é pedido ao montar; `ativar()` liga o `watchPosition` só depois da ação da pessoa;
 * - a primeira posição centraliza o mapa (`aoCentralizar`) e liga o modo seguir; as seguintes só
 *   movem o ponto, e o mapa as segue enquanto `seguindo`;
 * - `deixarDeSeguir()` (a pessoa arrastou o mapa) desliga o modo seguir; `ativar()` de novo volta a
 *   seguir e centraliza, sem pedir outra vez;
 * - com a aba oculta, o acompanhamento para, e volta quando ela reaparece;
 * - fora da RMR, permissão negada ou qualquer erro tiram o ponto e deixam só o aviso.
 * A posição fica só em estado React: nunca em `localStorage`, `sessionStorage`, cookies, URL, logs
 * nem requisições.
 */
export function useAcompanharLocalizacao(
  aoCentralizar: (lng: number, lat: number) => void,
): EstadoLocalizacao & { ativar: () => void; deixarDeSeguir: () => void } {
  const [estado, setEstado] = useState<EstadoLocalizacao>(PARADO);
  const aoCentralizarRef = useRef(aoCentralizar);
  useEffect(() => {
    aoCentralizarRef.current = aoCentralizar;
  }, [aoCentralizar]);

  // A sessão de acompanhamento e as ações sobre ela, criadas uma vez só.
  const [controle] = useState(() => {
    const sessao = { id: null as number | null, ativa: false, primeira: true, posicao: null as PosicaoPessoa | null };
    const geolocalizacao = () => (typeof navigator === "undefined" ? undefined : navigator.geolocation);

    const parar = () => {
      if (sessao.id === null) return;
      geolocalizacao()?.clearWatch(sessao.id);
      sessao.id = null;
    };

    const desligar = (resultado: ResultadoLocalizacao) => {
      parar();
      sessao.ativa = false;
      sessao.primeira = true;
      sessao.posicao = null;
      setEstado({ ...PARADO, resultado });
    };

    const iniciar = () => {
      const geo = geolocalizacao();
      if (!geo) {
        desligar("indisponivel");
        return;
      }
      if (sessao.id !== null) return;
      sessao.id = geo.watchPosition(
        ({ coords }) => {
          if (!dentroDaRmr(coords.latitude, coords.longitude)) {
            desligar("fora_da_regiao");
            return;
          }
          const posicao: PosicaoPessoa = { lat: coords.latitude, lng: coords.longitude, precisao: coords.accuracy };
          sessao.posicao = posicao;
          const primeira = sessao.primeira;
          sessao.primeira = false;
          setEstado((atual) => ({ posicao, seguindo: primeira || atual.seguindo, pedindo: false, resultado: "centralizado" }));
          if (primeira) aoCentralizarRef.current(posicao.lng, posicao.lat);
        },
        (erro) => desligar(erro.code === erro.PERMISSION_DENIED ? "negado" : "indisponivel"),
        OPCOES,
      );
    };

    return {
      ativar: () => {
        if (sessao.ativa && sessao.posicao) {
          const { lng, lat } = sessao.posicao;
          setEstado((atual) => ({ ...atual, seguindo: true }));
          aoCentralizarRef.current(lng, lat);
          return;
        }
        if (sessao.ativa) return; // ainda esperando a primeira posição
        sessao.ativa = true;
        sessao.primeira = true;
        setEstado({ ...PARADO, pedindo: true });
        iniciar();
      },
      deixarDeSeguir: () => setEstado((atual) => (atual.seguindo ? { ...atual, seguindo: false } : atual)),
      aoMudarVisibilidade: () => {
        if (!sessao.ativa) return;
        if (document.visibilityState === "hidden") parar();
        else iniciar();
      },
      parar,
    };
  });

  useEffect(() => {
    document.addEventListener("visibilitychange", controle.aoMudarVisibilidade);
    return () => {
      document.removeEventListener("visibilitychange", controle.aoMudarVisibilidade);
      controle.parar();
    };
  }, [controle]);

  return { ...estado, ativar: controle.ativar, deixarDeSeguir: controle.deixarDeSeguir };
}
