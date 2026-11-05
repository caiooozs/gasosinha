import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DetalhePostoDados, DetalheVM } from "@/features/postos/domain/detalhe";
import { DetalhePosto } from "./DetalhePosto";
import { PainelDetalhe } from "./PainelDetalhe";

const voltar = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ back: voltar, push: vi.fn() }) }));
// O painel busca pelo cliente do navegador; nos testes os dados já estão no cache.
vi.mock("@/lib/supabase/cliente-navegador", () => ({ supabaseNavegador: {} }));

const NBSP = " ";
const FONTE = "ANP – Levantamento de Preços de Combustíveis";

const comHistorico: DetalheVM = {
  cnpj: "11694577000167",
  nome: "IGUEP INCORPORADORA GUEDES PEREIRA LTDA",
  bandeira: "VIBRA",
  endereco: "AVENIDA ENG ABDIAS DE CARVALHO, 1142 · PRADO · Recife",
  semPreco: false,
  precoAtual: `R$${NBSP}6,59`,
  dataAtual: "20/10/2026",
  idadeTexto: "coletado há 7 dias",
  idadeAntiga: false,
  fonte: FONTE,
  variacaoTexto: `+R$${NBSP}0,10 (+1,5%) desde 13/10/2026`,
  direcaoVariacao: "subiu",
  semAnteriorTexto: null,
  historico: [
    { data: "20/10/2026", preco: `R$${NBSP}6,59` },
    { data: "13/10/2026", preco: `R$${NBSP}6,49` },
  ],
  avisoInativo: null,
};

describe("DetalhePosto", () => {
  it("o título é o nome do posto e mostra preço, data, fonte e endereço (FR-013)", () => {
    render(<DetalhePosto vm={comHistorico} />);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("IGUEP INCORPORADORA GUEDES PEREIRA LTDA");
    const texto = document.body.textContent ?? "";
    expect(texto).toContain(`R$${NBSP}6,59`);
    expect(texto).toContain("Coletado em 20/10/2026");
    expect(texto).toContain(FONTE);
    expect(texto).toContain("AVENIDA ENG ABDIAS DE CARVALHO, 1142 · PRADO · Recife");
    expect(texto).toContain(`+R$${NBSP}0,10 (+1,5%) desde 13/10/2026`);
  });

  it("idade antiga tem destaque com ícone e texto (FR-029)", () => {
    render(<DetalhePosto vm={{ ...comHistorico, idadeTexto: "coletado há 5 semanas", idadeAntiga: true }} />);
    const destaque = screen.getByText(/coletado há 5 semanas/);
    expect(destaque.closest("[data-antiga='true']")).not.toBeNull();
    expect(document.querySelector('[data-icone="relogio"]')).not.toBeNull();
    expect(document.body.textContent).toContain("coleta antiga");
  });

  it("sem coleta anterior mostra o texto em vez da variação (FR-016)", () => {
    render(
      <DetalhePosto
        vm={{ ...comHistorico, variacaoTexto: null, direcaoVariacao: null, semAnteriorTexto: "Ainda não há coleta anterior para comparar" }}
      />,
    );
    expect(document.body.textContent).toContain("Ainda não há coleta anterior para comparar");
    expect(document.body.textContent).not.toContain("desde 13/10/2026");
  });

  it("'sem preço' não mostra valor nem variação", () => {
    render(
      <DetalhePosto
        vm={{
          ...comHistorico,
          semPreco: true,
          precoAtual: null,
          dataAtual: null,
          idadeTexto: null,
          fonte: null,
          variacaoTexto: null,
          direcaoVariacao: null,
          historico: [],
        }}
      />,
    );
    const texto = document.body.textContent ?? "";
    expect(texto).toContain("sem preço");
    expect(texto).not.toContain("R$");
    expect(texto).not.toContain("desde");
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("o aviso de inativo aparece", () => {
    render(<DetalhePosto vm={{ ...comHistorico, avisoInativo: "Este posto não consta mais como autorizado pela ANP." }} />);
    expect(screen.getByText("Este posto não consta mais como autorizado pela ANP.")).toBeTruthy();
  });

  it("o histórico é uma lista, da mais recente para a mais antiga (FR-014)", () => {
    render(<DetalhePosto vm={comHistorico} />);
    const itens = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(itens).toEqual([`20/10/2026R$${NBSP}6,59`, `13/10/2026R$${NBSP}6,49`]);
  });
});

describe("PainelDetalhe", () => {
  const dados: DetalhePostoDados = {
    cnpj: "11694577000167",
    nome: "IGUEP INCORPORADORA GUEDES PEREIRA LTDA",
    bandeira: "VIBRA",
    endereco: "AVENIDA ENG ABDIAS DE CARVALHO, 1142",
    bairro: "PRADO",
    municipio: "RECIFE",
    lat: -8.06246,
    lng: -34.91138,
    ativo: true,
    coletas: [
      { data: "2026-10-20", precoMilesimos: 6590, fonte: FONTE },
      { data: "2026-10-13", precoMilesimos: 6490, fonte: FONTE },
    ],
  };

  function clienteComDados() {
    const cliente = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
    cliente.setQueryData(["detalhe-posto", dados.cnpj], dados);
    return cliente;
  }

  beforeEach(() => voltar.mockReset());

  it('modo="modal": fechar volta no histórico', async () => {
    render(
      <QueryClientProvider client={clienteComDados()}>
        <PainelDetalhe modo="modal" cnpj={dados.cnpj} hoje="2026-10-27" />
      </QueryClientProvider>,
    );
    expect((await screen.findByRole("dialog")).textContent).toContain("IGUEP INCORPORADORA GUEDES PEREIRA LTDA");
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(voltar).toHaveBeenCalledTimes(1);
  });

  it('modo="pagina": o HTML do servidor já tem o nome e o preço, sem portal, e "Voltar ao mapa" leva a /', () => {
    const html = renderToString(
      <QueryClientProvider client={clienteComDados()}>
        <PainelDetalhe modo="pagina" cnpj={dados.cnpj} hoje="2026-10-27" />
      </QueryClientProvider>,
    );
    expect(html).toContain("IGUEP INCORPORADORA GUEDES PEREIRA LTDA");
    expect(html).toContain("6,59");
    const documento = new DOMParser().parseFromString(html, "text/html");
    const voltar = [...documento.querySelectorAll("a")].find((a) => a.textContent?.includes("Voltar ao mapa"));
    expect(voltar?.getAttribute("href")).toBe("/");
  });
});
