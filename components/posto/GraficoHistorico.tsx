import type { GraficoHistoricoVM } from "@/features/postos/domain/detalhe";

// Área do desenho (unidades do viewBox): a coluna da esquerda é dos rótulos de preço, e a faixa de
// baixo, das datas das pontas.
const LARGURA = 300;
const ALTURA = 100;
const ESQUERDA = 30;
const DIREITA = 8;
const TOPO = 6;
const PLOTAGEM = 74;
const LINHA_DATAS = 96;

const px = (x: number) => ESQUERDA + x * (LARGURA - ESQUERDA - DIREITA);
const py = (y: number) => TOPO + (1 - y) * PLOTAGEM;

/**
 * Gráfico em degraus das coletas mais recentes (identidade visual, padrão do seuimposto): grade
 * quase invisível, a coleta anterior tracejada, só as datas das pontas e o ponto atual em
 * amarelo. Degrau, e não linha inclinada: entre duas coletas o preço não é interpolado
 * (Princípio I). Leitores de tela recebem os valores em `descricao`; a lista completa vem abaixo.
 */
export function GraficoHistorico({ grafico }: { grafico: GraficoHistoricoVM }) {
  const pontos = grafico.pontos.map((p) => ({ x: px(p.x), y: py(p.y) }));
  const caminho = pontos.map((p, i) => (i === 0 ? `M${p.x} ${p.y}` : `H${p.x}V${p.y}`)).join("");
  const atual = pontos[pontos.length - 1];
  const yReferencia = py(grafico.referenciaY);

  return (
    <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} role="img" aria-label={grafico.descricao} className="h-auto w-full">
      {grafico.rotulosY.map((rotulo) => (
        <g key={rotulo.texto}>
          <path d={`M${ESQUERDA} ${py(rotulo.y)}H${LARGURA}`} className="stroke-[var(--chart-grid)]" />
          <text x={0} y={py(rotulo.y) + 3.5} className="fill-[var(--chart-axis)] text-[10px] font-medium tabular-nums">
            {rotulo.texto}
          </text>
        </g>
      ))}
      <path d={`M${ESQUERDA} ${yReferencia}H${LARGURA}`} className="stroke-[var(--chart-ref)]" strokeDasharray="3 3" />
      <path d={caminho} fill="none" className="stroke-ink" strokeWidth={1.75} strokeLinejoin="round" />
      {pontos.slice(0, -1).map((p) => (
        <circle key={p.x} cx={p.x} cy={p.y} r={2.5} className="fill-bg stroke-ink" strokeWidth={1.75} />
      ))}
      <circle cx={atual.x} cy={atual.y} r={4.5} className="fill-yellow stroke-ink" strokeWidth={1.75} />

      <text x={px(0)} y={LINHA_DATAS} textAnchor="middle" className="fill-[var(--chart-axis)] text-[10px] tabular-nums">
        {grafico.inicio}
      </text>
      <path d={`M${LARGURA / 2 - 44} ${LINHA_DATAS - 3.5}h12`} className="stroke-[var(--chart-ref)]" strokeDasharray="3 3" />
      <text x={LARGURA / 2 - 28} y={LINHA_DATAS} className="fill-[var(--chart-axis)] text-[10px]">
        coleta anterior
      </text>
      <text x={LARGURA} y={LINHA_DATAS} textAnchor="end" className="fill-ink text-[10px] font-semibold tabular-nums">
        {grafico.fim}
      </text>
    </svg>
  );
}
