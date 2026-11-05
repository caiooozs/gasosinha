import { describe, expect, it, vi } from "vitest";
import { pedirLocalizacao } from "./pedir-localizacao";

type Sucesso = (posicao: GeolocationPosition) => void;
type Falha = (erro: GeolocationPositionError) => void;

/** Geolocalização falsa: responde com a posição ou com o erro dado. */
function geolocalizacao(resposta: { lat: number; lng: number } | { codigo: number }): Geolocation {
  return {
    getCurrentPosition: vi.fn((sucesso: Sucesso, falha?: Falha) => {
      if ("codigo" in resposta) {
        falha?.({ code: resposta.codigo, message: "", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
      } else {
        sucesso({ coords: { latitude: resposta.lat, longitude: resposta.lng } } as GeolocationPosition);
      }
    }),
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
  } as unknown as Geolocation;
}

describe("pedirLocalizacao", () => {
  it("dentro da RMR → centraliza e entrega a coordenada só ao callback", async () => {
    const aoCentralizar = vi.fn();
    const resultado = await pedirLocalizacao(geolocalizacao({ lat: -8.06, lng: -34.91 }), aoCentralizar);
    expect(resultado).toBe("centralizado");
    expect(aoCentralizar).toHaveBeenCalledWith(-34.91, -8.06);
  });

  it("o resultado não carrega a coordenada (Princípio III)", async () => {
    const resultado = await pedirLocalizacao(geolocalizacao({ lat: -8.06, lng: -34.91 }), () => {});
    expect(JSON.stringify(resultado)).not.toContain("8.06");
  });

  it("fora da RMR → não centraliza e devolve 'fora_da_regiao'", async () => {
    const aoCentralizar = vi.fn();
    const resultado = await pedirLocalizacao(geolocalizacao({ lat: -23.55, lng: -46.63 }), aoCentralizar);
    expect(resultado).toBe("fora_da_regiao");
    expect(aoCentralizar).not.toHaveBeenCalled();
  });

  it("permissão negada → 'negado'", async () => {
    expect(await pedirLocalizacao(geolocalizacao({ codigo: 1 }), () => {})).toBe("negado");
  });

  it("posição indisponível ou tempo esgotado → 'indisponivel'", async () => {
    expect(await pedirLocalizacao(geolocalizacao({ codigo: 2 }), () => {})).toBe("indisponivel");
    expect(await pedirLocalizacao(geolocalizacao({ codigo: 3 }), () => {})).toBe("indisponivel");
  });

  it("aparelho sem geolocalização → 'indisponivel'", async () => {
    expect(await pedirLocalizacao(undefined, () => {})).toBe("indisponivel");
  });
});
