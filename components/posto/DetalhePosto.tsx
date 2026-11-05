import { cn } from "cn";
import { SeloSemPreco, SeloVariacao } from "@/components/lista/Selos";
import { IconeRelogio } from "@/components/marca/Icones";
import type { DetalheVM } from "@/features/postos/domain/detalhe";
import { HistoricoPrecos } from "./HistoricoPrecos";

const ROTULO = "text-xs leading-4 font-medium tracking-wide text-ink-3 uppercase";

/**
 * Detalhe do posto (FR-013 a FR-016): nome, bandeira, endereço, preço mais recente com data, idade
 * e fonte, a variação desde a coleta anterior e o histórico. Só renderiza o que recebe do
 * viewmodel (Princípio IV).
 */
export function DetalhePosto({ vm, idTitulo }: { vm: DetalheVM; idTitulo?: string }) {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-1.5 px-5 pt-5 pb-5">
        <p className={ROTULO}>{vm.bandeira}</p>
        <h2 id={idTitulo} className="font-serif text-2xl font-semibold tracking-[-0.01em] text-ink">
          {vm.nome}
        </h2>
        <p className="text-sm text-ink-2">{vm.endereco}</p>
        {vm.avisoInativo && (
          <p className="mt-2 rounded-[10px] border border-yellow-line bg-yellow-soft px-3 py-2 text-sm font-medium text-yellow-ink">
            {vm.avisoInativo}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-line px-5 pt-5 pb-5">
        <p className={ROTULO}>Preço mais recente</p>
        {vm.semPreco ? (
          <div className="flex flex-col items-start gap-2">
            <SeloSemPreco />
            <p className="text-sm text-ink-2">A ANP ainda não coletou o preço da gasolina comum neste posto.</p>
          </div>
        ) : (
          <>
            <p className="text-[56px] leading-[56px] font-semibold tracking-tighter text-ink tabular-nums">{vm.precoAtual}</p>
            <p className="text-base text-ink">Coletado em {vm.dataAtual}</p>
            <p
              data-antiga={vm.idadeAntiga ? "true" : "false"}
              className={cn(
                "inline-flex w-max items-center gap-1.5 rounded-sm px-2 py-1 text-sm font-semibold",
                vm.idadeAntiga ? "border border-yellow-line bg-yellow-soft text-yellow-ink" : "bg-surface text-ink-2",
              )}
            >
              {vm.idadeAntiga && <IconeRelogio className="size-3.5" />}
              {vm.idadeTexto}
              {vm.idadeAntiga && <span> · coleta antiga</span>}
            </p>
            <p className="text-sm text-ink-2">Fonte: {vm.fonte}</p>
            <div className="pt-2">
              {vm.variacaoTexto && vm.direcaoVariacao ? (
                <SeloVariacao texto={vm.variacaoTexto} direcao={vm.direcaoVariacao} />
              ) : (
                <p className="text-sm text-ink-2">{vm.semAnteriorTexto}</p>
              )}
            </div>
          </>
        )}
      </div>

      {vm.historico.length > 0 && (
        <section aria-label="Histórico de preços" className="flex flex-col gap-2 border-t border-line px-5 pt-5 pb-6">
          <div className="flex items-baseline justify-between">
            <h3 className="font-serif text-xl font-semibold text-ink">Histórico</h3>
            <p className="text-sm text-ink-3">
              {vm.historico.length} {vm.historico.length === 1 ? "coleta" : "coletas"}
            </p>
          </div>
          <HistoricoPrecos itens={vm.historico} />
        </section>
      )}
    </div>
  );
}
