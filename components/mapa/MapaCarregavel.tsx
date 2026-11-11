"use client";

import dynamic from "next/dynamic";

/**
 * O mapa (MapLibre) é carregado sob demanda e só no navegador: ele depende de WebGL e é a maior
 * parte do JavaScript da página (guia "Lazy Loading" do Next).
 */

// O download do mapa começa assim que este módulo é avaliado no navegador, junto com a hidratação,
// em vez de esperar o primeiro render do componente: os marcadores chegam meio segundo antes
// (SC-003). O `import()` de dentro do `dynamic()` reaproveita o mesmo pedido.
if (typeof window !== "undefined") void import("./MapaPostos");

export const MapaCarregavel = dynamic(() => import("./MapaPostos").then((m) => m.MapaPostos), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center bg-muted text-sm text-muted-foreground">Carregando mapa…</div>
  ),
});
