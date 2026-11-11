import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TelaMapa } from "@/components/mapa/TelaMapa";
import { PainelDetalhe } from "@/components/posto/PainelDetalhe";
import { listarCnpjsParaPrerender, metadadosPosto, montarEstadoDetalhe } from "@/features/postos/viewmodels/detalhe-posto.server";
import { hojeParaRender } from "@/features/postos/viewmodels/hoje.server";

/** Os postos ativos são pré-renderizados; um posto novo é renderizado no primeiro acesso (R11). */
export async function generateStaticParams() {
  const cnpjs = await listarCnpjsParaPrerender();
  return cnpjs.map((cnpj) => ({ cnpj }));
}

export async function generateMetadata({ params }: PageProps<"/postos/[cnpj]">): Promise<Metadata> {
  const { cnpj } = await params;
  const metadados = await metadadosPosto(cnpj);
  if (!metadados) return { title: "Posto não encontrado — Gasosinha" };
  return { title: metadados.titulo, description: metadados.descricao };
}

/**
 * "/postos/[cnpj]": link direto do posto, indexável (FR-013). O detalhe aparece na própria página,
 * no cartão à direita (D4), com a lista à esquerda e o mapa centralizado no posto. Só compõe a
 * tela; os dados vêm do viewmodel de servidor.
 */
export default function PaginaPosto({ params }: PageProps<"/postos/[cnpj]">) {
  return (
    <Suspense
      fallback={
        <p role="status" className="m-auto text-sm text-ink-2">
          Carregando posto…
        </p>
      }
    >
      {params.then(({ cnpj }) => (
        <ConteudoPosto cnpj={cnpj} />
      ))}
    </Suspense>
  );
}

async function ConteudoPosto({ cnpj }: { cnpj: string }) {
  const [{ existe, estado, centro }, hoje] = await Promise.all([montarEstadoDetalhe(cnpj), hojeParaRender()]);
  if (!existe) notFound();
  return (
    <HydrationBoundary state={estado}>
      <TelaMapa
        hoje={hoje}
        centroInicial={centro ?? undefined}
        detalhe={<PainelDetalhe modo="pagina" cnpj={cnpj} hoje={hoje} />}
      />
    </HydrationBoundary>
  );
}
