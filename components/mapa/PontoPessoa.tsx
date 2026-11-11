// O halo da precisão é limitado, para uma posição muito imprecisa (Wi-Fi no computador) não cobrir
// o mapa inteiro; ele só aparece quando é maior que o próprio ponto.
const DIAMETRO_MAXIMO = 480;
const DIAMETRO_PONTO = 16;

/**
 * O ponto de "você está aqui" (D7): azul com borda branca, e um halo do tamanho da margem de erro
 * informada pelo aparelho. Não recebe cliques, para não atrapalhar os marcadores dos postos. Só
 * renderiza o raio que recebe do viewmodel.
 */
export function PontoPessoa({ raioHalo }: { raioHalo: number }) {
  const diametro = Math.min(raioHalo * 2, DIAMETRO_MAXIMO);
  return (
    <div role="img" aria-label="Você está aqui" className="pointer-events-none relative grid size-4 place-items-center">
      {diametro > DIAMETRO_PONTO && (
        <span
          aria-hidden="true"
          className="absolute rounded-full border border-posicao/40 bg-posicao/15"
          style={{ width: diametro, height: diametro }}
        />
      )}
      <span aria-hidden="true" className="relative size-4 rounded-full border-[3px] border-white bg-posicao shadow-[0_1px_4px_#0000004D]" />
    </div>
  );
}
