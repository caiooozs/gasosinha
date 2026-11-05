"use client";

import { LocateFixedIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocalizacao, type ResultadoLocalizacao } from "@/features/localizacao/viewmodels/useLocalizacao";

const MENSAGENS: Record<ResultadoLocalizacao, string | null> = {
  centralizado: null,
  negado: "Localização não permitida. O mapa continua na região padrão.",
  indisponivel: "Não foi possível obter sua localização.",
  fora_da_regiao: "Você está fora da área coberta",
};

/**
 * "Usar minha localização" (FR-003 a FR-005). Só pede permissão no clique, nunca ao montar. Guarda
 * apenas o resultado (para a mensagem), nunca a coordenada (Princípio III).
 */
export function BotaoLocalizacao({ aoCentralizar }: { aoCentralizar: (lng: number, lat: number) => void }) {
  const { pedir } = useLocalizacao(aoCentralizar);
  const [resultado, setResultado] = useState<ResultadoLocalizacao | null>(null);
  const [pedindo, setPedindo] = useState(false);

  async function aoClicar() {
    setPedindo(true);
    setResultado(null);
    try {
      setResultado(await pedir());
    } finally {
      setPedindo(false);
    }
  }

  const mensagem = resultado ? MENSAGENS[resultado] : null;
  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="outline" onClick={aoClicar} disabled={pedindo} className="h-9">
        <LocateFixedIcon aria-hidden="true" />
        Usar minha localização
      </Button>
      {/* A região fica sempre no documento, para a mensagem ser anunciada quando aparecer. */}
      <p role="status" className="text-xs text-muted-foreground">
        {mensagem}
      </p>
    </div>
  );
}
