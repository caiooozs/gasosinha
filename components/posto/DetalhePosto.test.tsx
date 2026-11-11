import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  variacaoPercentual: "+1,5%",
  direcaoVariacao: "subiu",
  reacao: "subiu",
  textoReacao: `Subiu R$${NBSP}0,10 (+1,5%) desde 13/10/2026`,
  historico: [
    { data: "20/10/2026", preco: `R$${NBSP}6,59` },
    { data: "13/10/2026", preco: `R$${NBSP}6,49` },
  ],
  grafico: {
    pontos: [
      { x: 0, y: 0.3 },
      { x: 1, y: 0.7 },
    ],
    rotulosY: [
      { texto: "6,50", y: 0.4 },
      { texto: "6,60", y: 0.8 },
    ],
    referenciaY: 0.3,
    inicio: "13/10",
    fim: "20/10",
    descricao: `Preço por coleta: 13/10, R$${NBSP}6,49; 20/10, R$${NBSP}6,59. A linha tracejada marca a coleta anterior.`,
  },
  variacoesColetas: [{ data: "20/10", texto: "+0,10", direcao: "subiu" }],
  avisoInativo: null,
};

describe("DetalhePosto", () => {
  it("o título é o nome do posto e mostra preço, data, fonte, endereço e a variação (FR-013, FR-015)", () => {
    render(<DetalhePosto vm={comHistorico} parado={false} />);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("IGUEP INCORPORADORA GUEDES PEREIRA LTDA");
    const texto = document.body.textContent ?? "";
    expect(texto).toContain(`R$${NBSP}6,59`);
    expect(texto).toContain("Coletado em 20/10/2026");
    expect(texto).toContain(FONTE);
    expect(texto).toContain("AVENIDA ENG ABDIAS DE CARVALHO, 1142 · PRADO · Recife");
    expect(texto).toContain(`Subiu R$${NBSP}0,10 (+1,5%) desde 13/10/2026`);
  });

  it("o Gasosinha apresenta a variação: pose da reação e o texto anunciado (FR-018, FR-019)", () => {
    const { container } = render(<DetalhePosto vm={comHistorico} parado={false} />);
    // Lido direto do elemento anunciado: o getByText troca o espaço inseparável do "R$" por um comum.
    expect(container.querySelector("[aria-live='polite']")?.textContent).toBe(`Subiu R$${NBSP}0,10 (+1,5%) desde 13/10/2026`);
    const poses = [...container.querySelectorAll("img")].map((img) => decodeURIComponent(img.getAttribute("src") ?? ""));
    expect(poses.some((src) => src.includes("/gasosinha/gasosinha-surpreso.png"))).toBe(true);
    expect(container.querySelector("[data-parado]")?.getAttribute("data-parado")).toBe("false");
  });

  it("com menos movimento, o Gasosinha fica parado e diz o mesmo (FR-020)", () => {
    const { container } = render(<DetalhePosto vm={comHistorico} parado />);
    expect(container.querySelector("[data-parado]")?.getAttribute("data-parado")).toBe("true");
    expect(container.querySelector("[aria-live='polite']")?.textContent).toBe(`Subiu R$${NBSP}0,10 (+1,5%) desde 13/10/2026`);
  });

  it("idade antiga tem destaque com ícone e texto (FR-029)", () => {
    render(<DetalhePosto vm={{ ...comHistorico, idadeTexto: "coletado há 5 semanas", idadeAntiga: true }} parado={false} />);
    const destaque = screen.getByText(/coletado há 5 semanas/);
    expect(destaque.closest("[data-antiga='true']")).not.toBeNull();
    expect(document.querySelector('[data-icone="relogio"]')).not.toBeNull();
    expect(document.body.textContent).toContain("coleta antiga");
  });

  it("sem coleta anterior, o Gasosinha neutro diz que não há comparação, sem variação (FR-016)", () => {
    render(
      <DetalhePosto
        vm={{
          ...comHistorico,
          variacaoPercentual: null,
          direcaoVariacao: null,
          reacao: "neutro",
          textoReacao: "Ainda não há coleta anterior para comparar",
        }}
        parado={false}
      />,
    );
    expect(document.body.textContent).toContain("Ainda não há coleta anterior para comparar");
    expect(document.body.textContent).not.toContain("desde 13/10/2026");
  });

  it("'sem preço' não mostra valor nem variação, e o Gasosinha diz que não há preço", () => {
    render(
      <DetalhePosto
        vm={{
          ...comHistorico,
          semPreco: true,
          precoAtual: null,
          dataAtual: null,
          idadeTexto: null,
          fonte: null,
          variacaoPercentual: null,
          direcaoVariacao: null,
          reacao: "neutro",
          textoReacao: "Sem preço coletado",
          historico: [],
        }}
        parado={false}
      />,
    );
    const texto = document.body.textContent ?? "";
    expect(texto).toContain("Sem preço coletado");
    expect(texto).not.toContain("R$");
    expect(texto).not.toContain("desde");
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("o aviso de inativo aparece", () => {
    render(<DetalhePosto vm={{ ...comHistorico, avisoInativo: "Este posto não consta mais como autorizado pela ANP." }} parado={false} />);
    expect(screen.getByText("Este posto não consta mais como autorizado pela ANP.")).toBeTruthy();
  });

  it("o histórico é uma lista, da mais recente para a mais antiga (FR-014)", () => {
    render(<DetalhePosto vm={comHistorico} parado={false} />);
    const itens = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(itens).toEqual([`20/10/2026R$${NBSP}6,59`, `13/10/2026R$${NBSP}6,49`]);
  });

  it("o gráfico das coletas recentes tem os valores para leitores de tela, e a grade mostra a variação com sinal", () => {
    render(<DetalhePosto vm={comHistorico} parado={false} />);
    expect(screen.getByRole("img", { name: /Preço por coleta: 13\/10/ })).toBeTruthy();
    expect(screen.getByText("Variação a cada coleta, em R$")).toBeTruthy();
    expect(screen.getByText("+0,10")).toBeTruthy();
  });

  it("uma coleta só: sem gráfico e sem grade", () => {
    render(<DetalhePosto vm={{ ...comHistorico, grafico: null, variacoesColetas: [] }} parado={false} />);
    expect(screen.queryByRole("img", { name: /Preço por coleta/ })).toBeNull();
    expect(screen.queryByText("Variação a cada coleta, em R$")).toBeNull();
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
    const dialogo = await screen.findByRole("dialog");
    expect(dialogo.textContent).toContain("IGUEP INCORPORADORA GUEDES PEREIRA LTDA");
    // O painel lê a preferência por menos movimento e a repassa ao Gasosinha.
    expect(dialogo.textContent).toContain(`Subiu R$${NBSP}0,10 (+1,5%) desde 13/10/2026`);
    expect(dialogo.querySelector("[data-parado]")?.getAttribute("data-parado")).toBe("false");
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(voltar).toHaveBeenCalledTimes(1);
  });

  it('modo="pagina": o HTML do servidor já tem o nome e o preço, sem portal, e "Fechar" leva a / (D4)', () => {
    const html = renderToString(
      <QueryClientProvider client={clienteComDados()}>
        <PainelDetalhe modo="pagina" cnpj={dados.cnpj} hoje="2026-10-27" />
      </QueryClientProvider>,
    );
    expect(html).toContain("IGUEP INCORPORADORA GUEDES PEREIRA LTDA");
    expect(html).toContain("6,59");
    const documento = new DOMParser().parseFromString(html, "text/html");
    // No servidor a preferência por menos movimento é desconhecida: o Gasosinha começa parado.
    expect(documento.querySelector("[data-parado]")?.getAttribute("data-parado")).toBe("true");
    // "Fechar" é um link para o mapa do site, nunca um "voltar" que poderia sair dele.
    const fechar = [...documento.querySelectorAll("a")].find((a) => a.textContent?.trim() === "Fechar");
    expect(fechar?.getAttribute("href")).toBe("/");
    expect(html).not.toContain("Voltar ao mapa");
  });

  it('modo="pagina": é um cartão nomeado pelo posto, não um diálogo, e "Fechar" não volta no histórico (D4)', async () => {
    render(
      <QueryClientProvider client={clienteComDados()}>
        <PainelDetalhe modo="pagina" cnpj={dados.cnpj} hoje="2026-10-27" />
      </QueryClientProvider>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    const cartao = screen.getByRole("region", { name: "IGUEP INCORPORADORA GUEDES PEREIRA LTDA" });
    expect(within(cartao).getByRole("link", { name: "Fechar" }).getAttribute("href")).toBe("/");
    expect(voltar).not.toHaveBeenCalled();
  });

  describe("histórico longo: as 6 coletas mais recentes e o resto sob demanda (D2)", () => {
    // 15 coletas semanais, da mais recente (20/10) para a mais antiga.
    const longo: DetalhePostoDados = {
      ...dados,
      coletas: Array.from({ length: 15 }, (_, i) => {
        const data = new Date(Date.UTC(2026, 9, 20 - 7 * i)).toISOString().slice(0, 10);
        return { data, precoMilesimos: 6590 - i * 10, fonte: FONTE };
      }),
    };
    const clienteLongo = () => {
      const cliente = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
      cliente.setQueryData(["detalhe-posto", longo.cnpj], longo);
      return cliente;
    };
    const coletasNaLista = () => within(screen.getByRole("list", { name: "Todas as coletas" })).getAllByRole("listitem");

    it("mostra as 6 mais recentes e o botão; cada clique traz mais, com o foco na primeira nova, até acabar", async () => {
      render(
        <QueryClientProvider client={clienteLongo()}>
          <PainelDetalhe modo="modal" cnpj={longo.cnpj} hoje="2026-10-27" />
        </QueryClientProvider>,
      );
      await screen.findByRole("dialog");
      expect(coletasNaLista()).toHaveLength(6);
      expect(screen.getByText("15 coletas")).toBeTruthy();
      await userEvent.click(screen.getByRole("button", { name: "Mostrar as 9 coletas restantes" }));
      expect(coletasNaLista()).toHaveLength(15);
      await waitFor(() => expect(document.activeElement).toBe(coletasNaLista()[6]));
      expect(screen.queryByRole("button", { name: /Mostrar/ })).toBeNull();
    });

    it("na página do posto, o HTML do servidor já traz as 6 primeiras", () => {
      const html = renderToString(
        <QueryClientProvider client={clienteLongo()}>
          <PainelDetalhe modo="pagina" cnpj={longo.cnpj} hoje="2026-10-27" />
        </QueryClientProvider>,
      );
      const documento = new DOMParser().parseFromString(html, "text/html");
      expect(documento.querySelectorAll("ol[aria-label='Todas as coletas'] li")).toHaveLength(6);
    });
  });

  it("no celular, o detalhe abre como folha na metade da tela, sem escurecer nem travar o toque no mapa (D9)", async () => {
    render(
      <QueryClientProvider client={clienteComDados()}>
        <PainelDetalhe modo="modal" cnpj={dados.cnpj} hoje="2026-10-27" />
      </QueryClientProvider>,
    );
    const folha = await screen.findByRole("dialog", { name: "IGUEP INCORPORADORA GUEDES PEREIRA LTDA" });
    expect(folha.getAttribute("data-vaul-drawer-direction")).toBe("bottom");
    expect(document.querySelector("[data-vaul-overlay]")).toBeNull();
    // O mapa acima da folha continua respondendo ao toque: a página não fica com os toques travados.
    await waitFor(() => expect(document.body.style.pointerEvents).not.toBe("none"));
  });

  describe("no computador, o detalhe não trava o mapa nem a lista (D1)", () => {
    const original = window.matchMedia;
    beforeEach(() => {
      window.matchMedia = (consulta: string) => ({ ...original(consulta), matches: consulta === "(min-width: 768px)" });
    });
    afterEach(() => {
      window.matchMedia = original;
    });

    function renderizarComOResto(aoClicarFora: () => void) {
      render(
        <QueryClientProvider client={clienteComDados()}>
          {/* Faz o papel do mapa e da lista, que ficam fora do painel. */}
          <button type="button" onClick={aoClicarFora}>
            Fora do painel
          </button>
          <PainelDetalhe modo="modal" cnpj={dados.cnpj} hoje="2026-10-27" />
        </QueryClientProvider>,
      );
    }

    it("não há sobreposição, o resto da tela continua clicável e clicar fora não fecha o detalhe", async () => {
      const aoClicarFora = vi.fn();
      renderizarComOResto(aoClicarFora);
      const dialogo = await screen.findByRole("dialog");
      expect(document.querySelector("[data-slot='sheet-overlay']")).toBeNull();
      await userEvent.click(screen.getByRole("button", { name: "Fora do painel" }));
      expect(aoClicarFora).toHaveBeenCalledTimes(1);
      expect(voltar).not.toHaveBeenCalled();
      expect(dialogo.isConnected).toBe(true);
    });

    it("ao abrir, o foco vai para o painel", async () => {
      renderizarComOResto(vi.fn());
      const dialogo = await screen.findByRole("dialog");
      expect(dialogo.contains(document.activeElement)).toBe(true);
    });

    it("Esc e \"Fechar\" continuam fechando, cada um com um router.back()", async () => {
      renderizarComOResto(vi.fn());
      await screen.findByRole("dialog");
      await userEvent.keyboard("{Escape}");
      expect(voltar).toHaveBeenCalledTimes(1);
      await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
      expect(voltar).toHaveBeenCalledTimes(2);
    });
  });
});
