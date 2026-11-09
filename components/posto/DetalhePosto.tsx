import { cn } from "cn";
import { Gasosinha } from "@/components/gasosinha/Gasosinha";
import { IconeRelogio } from "@/components/marca/Icones";
import { Moeda } from "@/components/numeros/Moeda";
import type { DetalheVM } from "@/features/postos/domain/detalhe";
import type { DirecaoVariacao } from "@/features/postos/domain/variacao";
import { GradeVariacoes } from "./GradeVariacoes";
import { GraficoHistorico } from "./GraficoHistorico";
import { HistoricoPrecos } from "./HistoricoPrecos";

const ROTULO = "text-xs leading-4 font-medium tracking-wide text-ink-3 uppercase";

const COR_VARIACAO: Record<DirecaoVariacao, string> = {
  subiu: "text-yellow-ink",
  caiu: "text-green-ink",
  igual: "text-ink-2",
};

/**
 * Detalhe do posto (FR-013 a FR-020): nome, bandeira, endereço, preço mais recente com data, idade
 * e fonte, o Gasosinha apresentando a variação desde a coleta anterior e o histórico. Só renderiza
 * o que recebe: o `vm` e o `parado` vêm do `PainelDetalhe` (Princípio IV).
 */
export function DetalhePosto({ vm, parado, idTitulo }: { vm: DetalheVM; parado: boolean; idTitulo?: string }) {
  const gasosinha = <Gasosinha reacao={vm.reacao} texto={vm.textoReacao} parado={parado} />;
  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-1.5 px-5 pt-5 pb-5 md:gap-1 md:px-4 md:pt-2 md:pb-4">
        <p className={ROTULO}>{vm.bandeira}</p>
        <h2 id={idTitulo} className="font-serif text-2xl font-semibold tracking-[-0.01em] text-ink md:text-[22px] md:leading-7">
          {vm.nome}
        </h2>
        <p className="text-sm text-ink-2">{vm.endereco}</p>
        {vm.avisoInativo && (
          <p className="mt-2 rounded-[10px] border border-yellow-line bg-yellow-soft px-3 py-2 text-sm font-medium text-yellow-ink">
            {vm.avisoInativo}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-line px-5 pt-5 pb-5 md:px-4 md:pt-4 md:pb-4">
        <p className={ROTULO}>Preço mais recente</p>
        {vm.semPreco ? (
          <div className="flex flex-col items-start gap-3">
            {gasosinha}
            <p className="text-sm text-ink-2">A ANP ainda não coletou o preço da gasolina comum neste posto.</p>
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between gap-3">
              <p className="text-[56px] leading-[56px] font-semibold tracking-tighter text-ink md:text-[44px] md:leading-[46px]">
                {vm.precoAtual && <Moeda texto={vm.precoAtual} classeSimbolo="text-[0.45em]" />}
              </p>
              {vm.variacaoPercentual && vm.direcaoVariacao && (
                // Destaque visual do percentual; o texto completo da variação vem logo abaixo, na fala do Gasosinha.
                <p aria-hidden="true" className="flex flex-col items-end gap-1 pb-1">
                  <span
                    className={cn(
                      "font-serif text-[32px] leading-none font-light tracking-[-0.04em] tabular-nums md:text-[28px]",
                      COR_VARIACAO[vm.direcaoVariacao],
                    )}
                  >
                    {vm.variacaoPercentual}
                  </span>
                  <span className="text-[11px] leading-3 text-ink-2">desde a coleta anterior</span>
                </p>
              )}
            </div>
            <p className="text-base text-ink">Coletado em {vm.dataAtual}</p>
            <p
              data-antiga={vm.idadeAntiga ? "true" : "false"}
              className={cn(
                "inline-flex w-max items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold",
                vm.idadeAntiga ? "border border-yellow-line bg-yellow-soft text-yellow-ink" : "bg-surface text-ink-2",
              )}
            >
              {vm.idadeAntiga && <IconeRelogio className="size-3.5" />}
              {vm.idadeTexto}
              {vm.idadeAntiga && <span> · coleta antiga</span>}
            </p>
            <p className="text-sm text-ink-2">Fonte: {vm.fonte}</p>
            {/* A variação em R$ e em %, com a data da coleta anterior, ou a falta dela (FR-015, FR-016). */}
            <div className="pt-2">{gasosinha}</div>
          </>
        )}
      </div>

      {vm.historico.length > 0 && (
        <section aria-label="Histórico de preços" className="flex flex-col gap-3 border-t border-line px-5 pt-5 pb-6 md:px-4 md:pt-4 md:pb-5">
          <div className="flex items-baseline justify-between">
            <h3 className="font-serif text-xl font-semibold text-ink md:text-lg">Histórico</h3>
            {/* ink-2: sobre o vidro, ink-3 pode ficar abaixo de 4,5:1. */}
            <p className="text-sm text-ink-2">
              {vm.historico.length} {vm.historico.length === 1 ? "coleta" : "coletas"}
            </p>
          </div>
          {vm.grafico && <GraficoHistorico grafico={vm.grafico} />}
          {vm.variacoesColetas.length > 0 && <GradeVariacoes itens={vm.variacoesColetas} />}
          {/* A lista traz todas as coletas (FR-014); o gráfico e a grade, só as mais recentes. */}
          {vm.grafico && <p className={cn(ROTULO, "pt-1")}>Todas as coletas</p>}
          <HistoricoPrecos itens={vm.historico} />
        </section>
      )}
    </div>
  );
}
