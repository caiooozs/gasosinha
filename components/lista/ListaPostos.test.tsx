import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { GrupoListaVM, ItemListaVM } from "@/features/postos/viewmodels/tipos";
import { ListaPostos, type ListaPostosProps } from "./ListaPostos";

const NBSP = " ";
const FONTE = "ANP – Levantamento de Preços de Combustíveis";

const recente: ItemListaVM = {
  cnpj: "11694577000167",
  nome: "IGUEP INCORPORADORA GUEDES PEREIRA LTDA",
  bandeira: "VIBRA",
  semPreco: false,
  preco: `R$${NBSP}6,59`,
  data: "20/10/2026",
  idade: "há 7 dias",
  antiga: false,
  fonte: FONTE,
  fonteCurta: "ANP",
  variacao: { valor: "+0,10 (+1,5%)", data: "13/10", acessivel: `Variação: +R$${NBSP}0,10 (+1,5%) desde 13/10/2026` },
  direcaoVariacao: "subiu",
  maisBarato: true,
  acimaDoMaisBarato: null,
};
const antiga: ItemListaVM = {
  cnpj: "05648920000134",
  nome: "POSTO ANTIGO LTDA",
  bandeira: "bandeira não informada",
  semPreco: false,
  preco: `R$${NBSP}6,29`,
  data: "22/09/2026",
  idade: "há 5 semanas",
  antiga: true,
  fonte: FONTE,
  fonteCurta: "ANP",
  variacao: null,
  direcaoVariacao: null,
  maisBarato: false,
  acimaDoMaisBarato: null,
};
const semPreco: ItemListaVM = {
  cnpj: "08220930000162",
  nome: "POSTO SEM COLETA LTDA",
  bandeira: "BRANCA",
  semPreco: true,
  antiga: false,
  variacao: null,
  direcaoVariacao: null,
  maisBarato: false,
  acimaDoMaisBarato: null,
};

const grupos: GrupoListaVM[] = [
  { titulo: "Coletas recentes", itens: [recente] },
  { titulo: "Coletas antigas (mais de 4 semanas)", itens: [antiga] },
  { titulo: "Sem preço", itens: [semPreco] },
];

function props(extra: Partial<ListaPostosProps> = {}): ListaPostosProps {
  return {
    titulo: "3 postos nesta área",
    grupos,
    vazia: false,
    sentido: "asc",
    onDefinirSentido: () => {},
    estado: "pronto",
    onTentarDeNovo: () => {},
    onVerRegiaoInteira: () => {},
    ...extra,
  };
}

const renderizar = (extra: Partial<ListaPostosProps> = {}) => render(<ListaPostos {...props(extra)} />);

describe("ListaPostos", () => {
  it("mostra a contagem da área como título", () => {
    renderizar();
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("3 postos nesta área");
  });

  it("renderiza os grupos com os títulos, na ordem recebida (FR-011)", () => {
    renderizar();
    const titulos = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titulos).toEqual(["Coletas recentes", "Coletas antigas (mais de 4 semanas)", "Sem preço"]);
  });

  it("item com preço mostra nome, bandeira, preço, data, idade, fonte e variação (FR-010)", () => {
    renderizar();
    const item = screen.getByRole("link", { name: /IGUEP/ });
    const texto = item.textContent ?? "";
    expect(texto).toContain("IGUEP INCORPORADORA GUEDES PEREIRA LTDA");
    expect(texto).toContain("VIBRA");
    expect(texto).toContain(`R$${NBSP}6,59`);
    expect(texto).toContain("coletado em 20/10/2026");
    expect(texto).toContain("há 7 dias");
    expect(texto).toContain(FONTE);
    expect(texto).toContain(`Variação: +R$${NBSP}0,10 (+1,5%) desde 13/10/2026`);
    expect(texto).not.toContain("coleta antiga");
  });

  it("o selo de variação mostra a forma curta numa linha, e o texto completo fica só para leitores de tela (D3)", () => {
    renderizar();
    const item = screen.getByRole("link", { name: /IGUEP/ });
    const selo = item.querySelector("[data-selo='variacao']");
    expect(selo?.textContent).toBe("+0,10 (+1,5%) desde 13/10");
    expect(selo?.getAttribute("aria-hidden")).toBe("true");
    expect(selo?.className).toContain("whitespace-nowrap");
    // Em telas com menos de 360 px, o "desde" some para o selo caber ao lado do preço ("+0,10 (+1,5%) 13/10").
    expect(within(selo as HTMLElement).getByText("desde").className).toContain("max-[359px]:hidden");
    // Busca direta: o getByText troca o espaço inseparável do "R$" por um comum.
    const completo = [...item.querySelectorAll("span")].find((s) => s.textContent === `Variação: +R$${NBSP}0,10 (+1,5%) desde 13/10/2026`);
    expect(completo?.className).toContain("sr-only");
  });

  it("o mais barato da área tem o selo 'mais barato'", () => {
    renderizar();
    expect(screen.getByRole("link", { name: /IGUEP/ }).textContent).toMatch(/mais barato/i);
    expect(screen.getByRole("link", { name: /POSTO ANTIGO/ }).textContent).not.toMatch(/mais barato/i);
  });

  it("a linha mostra quanto o posto custa a mais que o mais barato, com o texto completo para leitores de tela", () => {
    const acima: ItemListaVM = {
      ...recente,
      cnpj: "1",
      nome: "POSTO MAIS CARO",
      maisBarato: false,
      acimaDoMaisBarato: { curto: "+0,40", acessivel: `R$${NBSP}0,40 acima do mais barato da área` },
    };
    renderizar({ grupos: [{ titulo: "Coletas recentes", itens: [acima] }] });
    const linha = screen.getByRole("link", { name: /POSTO MAIS CARO/ });
    expect(linha.textContent).toContain("+0,40 · ANP");
    expect(linha.textContent).toContain(`R$${NBSP}0,40 acima do mais barato da área`);
  });

  it("a régua da área é lida como uma frase só", () => {
    renderizar({
      regua: {
        diferenca: `R$${NBSP}0,40`,
        percentual: "6,5%",
        menor: `R$${NBSP}6,19`,
        maior: `R$${NBSP}6,59`,
        pontos: [
          { cnpj: "a", posicao: 0, maisBarato: true },
          { cnpj: "b", posicao: 1, maisBarato: false },
        ],
        descricao: "Preços das coletas recentes da área: de R$ 6,19 a R$ 6,59, diferença de R$ 0,40 (6,5%).",
      },
    });
    expect(screen.getByRole("img", { name: /diferença de R\$ 0,40 \(6,5%\)/ })).toBeTruthy();
  });

  it("item sem coleta anterior mostra 'sem coleta anterior'", () => {
    renderizar();
    expect(screen.getByRole("link", { name: /POSTO ANTIGO/ }).textContent).toContain("sem coleta anterior");
  });

  it("coleta antiga mostra o ícone de relógio e o texto 'coleta antiga' junto da idade (FR-029)", () => {
    renderizar();
    const item = screen.getByRole("link", { name: /POSTO ANTIGO/ });
    expect(item.textContent).toContain("coleta antiga");
    expect(item.textContent).toContain("há 5 semanas");
    expect(item.querySelector('[data-icone="relogio"]')).not.toBeNull();
  });

  it("item sem preço mostra nome, bandeira e 'sem preço'", () => {
    renderizar();
    const texto = screen.getByRole("link", { name: /POSTO SEM COLETA/ }).textContent ?? "";
    expect(texto).toContain("POSTO SEM COLETA LTDA");
    expect(texto).toContain("BRANCA");
    expect(texto).toContain("sem preço");
    expect(texto).not.toContain("coletado em");
  });

  it("cada item é um link para /postos/<cnpj>", () => {
    renderizar();
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/postos/11694577000167", "/postos/05648920000134", "/postos/08220930000162"]);
  });

  it("os itens estão em listas semânticas", () => {
    renderizar();
    const listas = screen.getAllByRole("list");
    expect(listas).toHaveLength(3);
    expect(within(listas[0]).getAllByRole("listitem")).toHaveLength(1);
  });

  it("lista vazia mostra 'Nenhum posto nesta área' e 'Ver a região inteira'", async () => {
    const onVerRegiaoInteira = vi.fn();
    renderizar({ grupos: [], vazia: true, titulo: "0 postos nesta área", onVerRegiaoInteira });
    expect(screen.getByText("Nenhum posto nesta área")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Ver a região inteira" }));
    expect(onVerRegiaoInteira).toHaveBeenCalledTimes(1);
  });

  it("carregando mostra 'Buscando os preços…' em role=status", () => {
    renderizar({ grupos: [], vazia: true, estado: "carregando" });
    expect(screen.getByRole("status").textContent).toContain("Buscando os preços…");
    expect(screen.queryByText("Nenhum posto nesta área")).toBeNull();
  });

  it("erro sem itens mostra a mensagem e 'Tentar de novo', que chama onTentarDeNovo", async () => {
    const onTentarDeNovo = vi.fn();
    renderizar({ grupos: [], vazia: true, estado: "erro", onTentarDeNovo });
    expect(screen.getByText("Não foi possível carregar os postos.")).toBeTruthy();
    expect(screen.queryByText("Nenhum posto nesta área")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(onTentarDeNovo).toHaveBeenCalledTimes(1);
  });

  it("erro com itens anteriores mantém os itens e mostra a mensagem acima deles", () => {
    renderizar({ estado: "erro" });
    const mensagem = screen.getByText("Não foi possível carregar os postos.");
    const primeiroLink = screen.getAllByRole("link")[0];
    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(mensagem.compareDocumentPosition(primeiroLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeTruthy();
  });

  it("a ordem de preço é um controle segmentado: Menor preço / Maior preço", async () => {
    const onDefinirSentido = vi.fn();
    renderizar({ onDefinirSentido });
    const menor = screen.getByRole("button", { name: /Menor preço/ });
    const maior = screen.getByRole("button", { name: /Maior preço/ });
    expect(menor.getAttribute("aria-pressed")).toBe("true");
    expect(maior.getAttribute("aria-pressed")).toBe("false");
    await userEvent.click(maior);
    expect(onDefinirSentido).toHaveBeenCalledWith("desc");
  });

  describe("'Mostrar mais' (D2)", () => {
    const outro = (i: number): ItemListaVM => ({ ...recente, cnpj: `9${String(i).padStart(13, "0")}`, nome: `POSTO EXTRA ${i}`, maisBarato: false });

    /** A lista com o viewmodel de verdade fazendo o papel de "mostrar mais": cada clique traz mais 2 itens. */
    function ListaQueCresce({ total }: { total: number }) {
      const [quantidade, setQuantidade] = useState(2);
      const itens = Array.from({ length: Math.min(quantidade, total) }, (_, i) => outro(i));
      const restantes = total - itens.length;
      return (
        <ListaPostos
          {...props({ grupos: [{ titulo: "Coletas recentes", itens }] })}
          mostrarMais={restantes > 0 ? { texto: `Mostrar mais (faltam ${restantes})`, onMostrarMais: () => setQuantidade((q) => q + 2) } : null}
        />
      );
    }

    it("sem mais itens, não há botão", () => {
      renderizar({ mostrarMais: null });
      expect(screen.queryByRole("button", { name: /Mostrar/ })).toBeNull();
    });

    it("o botão fica abaixo da lista, com o texto do viewmodel, e chama onMostrarMais", async () => {
      const onMostrarMais = vi.fn();
      renderizar({ mostrarMais: { texto: "Mostrar mais 20 (faltam 123)", onMostrarMais } });
      const botao = screen.getByRole("button", { name: "Mostrar mais 20 (faltam 123)" });
      const ultimoLink = screen.getAllByRole("link").at(-1)!;
      expect(ultimoLink.compareDocumentPosition(botao) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      await userEvent.click(botao);
      expect(onMostrarMais).toHaveBeenCalledTimes(1);
    });

    it("ao mostrar mais, o foco vai para o primeiro item novo, e o botão some no fim", async () => {
      render(<ListaQueCresce total={3} />);
      expect(screen.getAllByRole("link")).toHaveLength(2);
      await userEvent.click(screen.getByRole("button", { name: "Mostrar mais (faltam 1)" }));
      expect(screen.getAllByRole("link")).toHaveLength(3);
      await waitFor(() => expect(document.activeElement?.textContent).toContain("POSTO EXTRA 2"));
      expect(screen.queryByRole("button", { name: /Mostrar mais/ })).toBeNull();
    });
  });
});
