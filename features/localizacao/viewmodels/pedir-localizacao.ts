import { dentroDaRmr } from "@/supabase/functions/_shared/regiao-rmr";

export type ResultadoLocalizacao = "centralizado" | "negado" | "indisponivel" | "fora_da_regiao";

/** Precisão de bairro basta para centralizar o mapa; uma posição de até 1 minuto atrás serve. */
const OPCOES: PositionOptions = { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 };

/**
 * Pede a posição uma vez e a entrega **apenas** a `aoCentralizar` (Princípio III, FR-004). A
 * coordenada não é devolvida, guardada nem registrada: o resultado só diz o que aconteceu.
 * Fora da RMR, o mapa não se move (FR-005).
 */
export function pedirLocalizacao(
  geolocalizacao: Geolocation | undefined,
  aoCentralizar: (lng: number, lat: number) => void,
): Promise<ResultadoLocalizacao> {
  if (!geolocalizacao) return Promise.resolve("indisponivel");
  return new Promise((resolver) => {
    geolocalizacao.getCurrentPosition(
      ({ coords }) => {
        if (!dentroDaRmr(coords.latitude, coords.longitude)) {
          resolver("fora_da_regiao");
          return;
        }
        aoCentralizar(coords.longitude, coords.latitude);
        resolver("centralizado");
      },
      (erro) => resolver(erro.code === erro.PERMISSION_DENIED ? "negado" : "indisponivel"),
      OPCOES,
    );
  });
}
