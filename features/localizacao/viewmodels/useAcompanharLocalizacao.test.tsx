import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAcompanharLocalizacao } from "./useAcompanharLocalizacao";

type Sucesso = (posicao: GeolocationPosition) => void;
type Falha = (erro: GeolocationPositionError) => void;

/** Geolocalização falsa com `watchPosition`: o teste decide quando chegam posições e erros. */
function criarGeolocalizacao() {
  let sucesso: Sucesso | null = null;
  let falha: Falha | null = null;
  let proximoId = 1;
  const geo = {
    getCurrentPosition: vi.fn(),
    watchPosition: vi.fn((s: Sucesso, f?: Falha) => {
      sucesso = s;
      falha = f ?? null;
      return proximoId++;
    }),
    clearWatch: vi.fn(() => {
      sucesso = null;
      falha = null;
    }),
  };
  return {
    geo,
    emitir: (lat: number, lng: number, precisao = 20) =>
      act(() => sucesso?.({ coords: { latitude: lat, longitude: lng, accuracy: precisao } } as GeolocationPosition)),
    falhar: (codigo: number) =>
      act(() => falha?.({ code: codigo, message: "", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError)),
  };
}

let visibilidade: DocumentVisibilityState = "visible";
function mudarVisibilidade(estado: DocumentVisibilityState) {
  visibilidade = estado;
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

let falsa: ReturnType<typeof criarGeolocalizacao>;
const fetchOriginal = globalThis.fetch;

beforeEach(() => {
  falsa = criarGeolocalizacao();
  Object.defineProperty(navigator, "geolocation", { value: falsa.geo, configurable: true });
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibilidade });
  visibilidade = "visible";
  globalThis.fetch = vi.fn() as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = fetchOriginal;
});

describe("useAcompanharLocalizacao (D7)", () => {
  it("não pede a localização ao montar: só depois de 'usar minha localização' (FR-003)", () => {
    renderHook(() => useAcompanharLocalizacao(() => {}));
    expect(falsa.geo.watchPosition).not.toHaveBeenCalled();
    expect(falsa.geo.getCurrentPosition).not.toHaveBeenCalled();
  });

  it("depois do pedido, acompanha com alta precisão, centraliza na primeira posição e liga o modo seguir", () => {
    const aoCentralizar = vi.fn();
    const { result } = renderHook(() => useAcompanharLocalizacao(aoCentralizar));
    act(() => result.current.ativar());
    expect(falsa.geo.watchPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), expect.objectContaining({ enableHighAccuracy: true }));
    expect(result.current.pedindo).toBe(true);
    falsa.emitir(-8.06, -34.91, 25);
    expect(result.current.posicao).toEqual({ lat: -8.06, lng: -34.91, precisao: 25 });
    expect(result.current.seguindo).toBe(true);
    expect(result.current.resultado).toBe("centralizado");
    expect(result.current.pedindo).toBe(false);
    expect(aoCentralizar).toHaveBeenCalledTimes(1);
    expect(aoCentralizar).toHaveBeenCalledWith(-34.91, -8.06);
  });

  it("cada posição nova move o ponto, sem centralizar de novo (quem segue é o mapa)", () => {
    const aoCentralizar = vi.fn();
    const { result } = renderHook(() => useAcompanharLocalizacao(aoCentralizar));
    act(() => result.current.ativar());
    falsa.emitir(-8.06, -34.91);
    falsa.emitir(-8.061, -34.912);
    expect(result.current.posicao).toMatchObject({ lat: -8.061, lng: -34.912 });
    expect(aoCentralizar).toHaveBeenCalledTimes(1);
  });

  it("arrastar o mapa desliga o modo seguir; o botão de novo volta a seguir e centraliza, sem pedir outra vez", () => {
    const aoCentralizar = vi.fn();
    const { result } = renderHook(() => useAcompanharLocalizacao(aoCentralizar));
    act(() => result.current.ativar());
    falsa.emitir(-8.06, -34.91);
    act(() => result.current.deixarDeSeguir());
    expect(result.current.seguindo).toBe(false);
    expect(result.current.posicao).not.toBeNull();
    act(() => result.current.ativar());
    expect(result.current.seguindo).toBe(true);
    expect(aoCentralizar).toHaveBeenCalledTimes(2);
    expect(falsa.geo.watchPosition).toHaveBeenCalledTimes(1);
  });

  it("com a aba oculta o acompanhamento para, e volta quando ela reaparece", () => {
    const { result } = renderHook(() => useAcompanharLocalizacao(() => {}));
    act(() => result.current.ativar());
    falsa.emitir(-8.06, -34.91);
    mudarVisibilidade("hidden");
    expect(falsa.geo.clearWatch).toHaveBeenCalledTimes(1);
    mudarVisibilidade("visible");
    expect(falsa.geo.watchPosition).toHaveBeenCalledTimes(2);
  });

  it("fora da RMR: sem ponto, sem acompanhar e com o aviso de hoje (FR-005)", () => {
    const aoCentralizar = vi.fn();
    const { result } = renderHook(() => useAcompanharLocalizacao(aoCentralizar));
    act(() => result.current.ativar());
    falsa.emitir(-23.55, -46.63);
    expect(result.current.posicao).toBeNull();
    expect(result.current.resultado).toBe("fora_da_regiao");
    expect(falsa.geo.clearWatch).toHaveBeenCalled();
    expect(aoCentralizar).not.toHaveBeenCalled();
  });

  it("permissão negada, ou revogada no meio do caminho, tira o ponto e mostra o aviso", () => {
    const { result } = renderHook(() => useAcompanharLocalizacao(() => {}));
    act(() => result.current.ativar());
    falsa.emitir(-8.06, -34.91);
    falsa.falhar(1);
    expect(result.current.posicao).toBeNull();
    expect(result.current.seguindo).toBe(false);
    expect(result.current.resultado).toBe("negado");
    expect(falsa.geo.clearWatch).toHaveBeenCalled();
  });

  it("outro erro do aparelho também tira o ponto, com o aviso de indisponível", () => {
    const { result } = renderHook(() => useAcompanharLocalizacao(() => {}));
    act(() => result.current.ativar());
    falsa.falhar(2);
    expect(result.current.posicao).toBeNull();
    expect(result.current.resultado).toBe("indisponivel");
  });

  it("a posição fica só na memória: nada no navegador, na URL nem em requisições (Princípio III)", () => {
    const urlAntes = window.location.href;
    const { result } = renderHook(() => useAcompanharLocalizacao(() => {}));
    act(() => result.current.ativar());
    falsa.emitir(-8.06, -34.91);
    falsa.emitir(-8.061, -34.912);
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(document.cookie).toBe("");
    expect(window.location.href).toBe(urlAntes);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("ao sair da página, o acompanhamento para", () => {
    const { result, unmount } = renderHook(() => useAcompanharLocalizacao(() => {}));
    act(() => result.current.ativar());
    unmount();
    expect(falsa.geo.clearWatch).toHaveBeenCalled();
  });
});
