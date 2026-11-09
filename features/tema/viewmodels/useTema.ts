"use client";

import { useCallback, useSyncExternalStore } from "react";
import { CHAVE_TEMA, resolverTema, type Tema } from "../tema";

const CONSULTA_ESCURO = "(prefers-color-scheme: dark)";

function lerGuardado(): string | null {
  try {
    return localStorage.getItem(CHAVE_TEMA);
  } catch {
    return null; // armazenamento bloqueado: vale a preferência do sistema
  }
}

function aplicar(tema: Tema) {
  document.documentElement.classList.toggle("dark", tema === "escuro");
}

const temaAtual = (): Tema => (document.documentElement.classList.contains("dark") ? "escuro" : "claro");

/**
 * Acompanha a classe `dark` do <html> (posta pelo SCRIPT_TEMA antes da pintura) e, enquanto não
 * houver escolha manual, a preferência do sistema.
 */
function assinar(avisar: () => void) {
  const observador = new MutationObserver(avisar);
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  const consulta = window.matchMedia(CONSULTA_ESCURO);
  const aoMudarSistema = () => aplicar(resolverTema(lerGuardado(), consulta.matches));
  consulta.addEventListener("change", aoMudarSistema);
  return () => {
    observador.disconnect();
    consulta.removeEventListener("change", aoMudarSistema);
  };
}

/** Tema atual e a troca manual, que fica guardada para as próximas visitas. */
export function useTema(): { tema: Tema; alternar: () => void } {
  // No servidor não há preferência: renderiza o claro, e o navegador corrige depois da hidratação.
  const tema = useSyncExternalStore(assinar, temaAtual, (): Tema => "claro");
  const alternar = useCallback(() => {
    const proximo: Tema = temaAtual() === "escuro" ? "claro" : "escuro";
    aplicar(proximo);
    try {
      localStorage.setItem(CHAVE_TEMA, proximo);
    } catch {
      // armazenamento bloqueado: a troca vale só nesta visita
    }
  }, []);
  return { tema, alternar };
}
