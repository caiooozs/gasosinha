import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  variacao: `+R$${NBSP}0,10 (+1,5%) desde 13/10/2026`,
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
  variacao: null,
};
const semPreco: ItemListaVM = {
  cnpj: "08220930000162",
  nome: "POSTO SEM COLETA LTDA",
  bandeira: "BRANCA",
  semPreco: true,
  antiga: false,
  variacao: null,
};

const grupos: GrupoListaVM[] = [
  { titulo: "Coletas recentes", itens: [recente] },
  { titulo: "Coletas antigas (mais de 4 semanas)", itens: [antiga] },
  { titulo: "Sem preço", itens: [semPreco] },
];

function renderizar(props: Partial<ListaPostosProps> = {}) {
  const padrao: ListaPostosProps = {
    grupos,
    vazia: false,
    sentido: "asc",
    onAlternarSentido: () => {},
    estado: "pronto",
    onTentarDeNovo: () => {},
  };
  return render(<ListaPostos {...padrao} {...props} />);
}

describe("ListaPostos", () => {
  it("renderiza os grupos com os títulos, na ordem recebida", () => {
    renderizar();
    const titulos = screen.getAllByRole("heading").map((h) => h.textContent);
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
    expect(texto).toContain(`+R$${NBSP}0,10 (+1,5%) desde 13/10/2026`);
    expect(texto).not.toContain("coleta antiga");
  });

  it("item sem coleta anterior mostra 'sem coleta anterior'", () => {
    renderizar();
    const item = screen.getByRole("link", { name: /POSTO ANTIGO/ });
    expect(item.textContent).toContain("sem coleta anterior");
  });

  it("coleta antiga mostra o ícone de relógio e o texto 'coleta antiga' junto da idade (FR-029)", () => {
    renderizar();
    const item = screen.getByRole("link", { name: /POSTO ANTIGO/ });
    expect(item.textContent).toContain("coleta antiga");
    expect(item.textContent).toContain("há 5 semanas");
    expect(item.querySelector("svg")).not.toBeNull();
  });

  it("item sem preço mostra nome, bandeira e 'sem preço'", () => {
    renderizar();
    const item = screen.getByRole("link", { name: /POSTO SEM COLETA/ });
    const texto = item.textContent ?? "";
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

  it("os itens estão numa lista semântica", () => {
    renderizar();
    const listas = screen.getAllByRole("list");
    expect(listas).toHaveLength(3);
    expect(within(listas[0]).getAllByRole("listitem")).toHaveLength(1);
  });

  it("lista vazia mostra 'Nenhum posto nesta área'", () => {
    renderizar({ grupos: [], vazia: true });
    expect(screen.getByText("Nenhum posto nesta área")).toBeTruthy();
  });

  it("carregando mostra 'Carregando postos…' em role=status", () => {
    renderizar({ grupos: [], vazia: true, estado: "carregando" });
    expect(screen.getByRole("status").textContent).toContain("Carregando postos…");
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
    const { container } = renderizar({ estado: "erro" });
    const mensagem = screen.getByText("Não foi possível carregar os postos.");
    const primeiroLink = screen.getAllByRole("link")[0];
    expect(screen.getAllByRole("link")).toHaveLength(3);
    // A mensagem vem antes dos itens no documento.
    const posicao = mensagem.compareDocumentPosition(primeiroLink);
    expect(posicao & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.textContent).toContain("Tentar de novo");
  });

  it("o botão de ordem alterna entre 'Mais barato primeiro' e 'Mais caro primeiro'", async () => {
    const onAlternarSentido = vi.fn();
    const { rerender } = renderizar({ onAlternarSentido });
    const botao = screen.getByRole("button", { name: /Mais barato primeiro/ });
    await userEvent.click(botao);
    expect(onAlternarSentido).toHaveBeenCalledTimes(1);

    rerender(
      <ListaPostos
        grupos={grupos}
        vazia={false}
        sentido="desc"
        onAlternarSentido={onAlternarSentido}
        estado="pronto"
        onTentarDeNovo={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /Mais caro primeiro/ })).toBeTruthy();
  });
});
