import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { MarcadorVM } from "@/features/postos/viewmodels/tipos";
import { MarcadorGrupo } from "./MarcadorGrupo";
import { MarcadorPosto } from "./MarcadorPosto";

const NBSP = " ";

const comPreco: MarcadorVM = {
  cnpj: "11694577000167",
  lng: -34.91138,
  lat: -8.06246,
  preco: `R$${NBSP}6,59`,
  idade: "há 7 d",
  nomeAcessivel: `IGUEP INCORPORADORA GUEDES PEREIRA LTDA, VIBRA, gasolina comum R$${NBSP}6,59, coletado em 20/10/2026`,
  antigo: false,
  semPreco: false,
  maisBarato: false,
};

describe("MarcadorPosto", () => {
  it("é um botão com o nome acessível da VM", () => {
    render(<MarcadorPosto vm={comPreco} onSelecionar={() => {}} />);
    const botao = screen.getByRole("button", { name: comPreco.nomeAcessivel });
    expect(botao.tagName).toBe("BUTTON");
  });

  it("mostra o preço e a idade da coleta (FR-007)", () => {
    render(<MarcadorPosto vm={comPreco} onSelecionar={() => {}} />);
    const texto = screen.getByRole("button").textContent ?? "";
    expect(texto).toContain(`R$${NBSP}6,59`);
    expect(texto).toContain("há 7 d");
  });

  it("sem preço tem outra forma (data-variante) e o texto 'sem preço' (FR-008)", () => {
    const vm: MarcadorVM = { ...comPreco, preco: null, idade: null, semPreco: true, nomeAcessivel: "POSTO X, VIBRA, sem preço" };
    render(<MarcadorPosto vm={vm} onSelecionar={() => {}} />);
    const botao = screen.getByRole("button", { name: vm.nomeAcessivel });
    expect(botao.getAttribute("data-variante")).toBe("sem-preco");
    expect(botao.textContent).toContain("sem preço");
  });

  it("com preço tem a variante 'com-preco'", () => {
    render(<MarcadorPosto vm={comPreco} onSelecionar={() => {}} />);
    expect(screen.getByRole("button").getAttribute("data-variante")).toBe("com-preco");
  });

  it("antigo mostra o ícone de relógio e o texto da idade, além da cor (FR-029)", () => {
    const vm: MarcadorVM = { ...comPreco, preco: `R$${NBSP}6,49`, idade: "há 5 sem", antigo: true };
    render(<MarcadorPosto vm={vm} onSelecionar={() => {}} />);
    const botao = screen.getByRole("button");
    expect(botao.querySelector('[data-icone="relogio"]')).not.toBeNull();
    expect(botao.textContent).toContain("há 5 sem");
    expect(botao.getAttribute("data-antigo")).toBe("true");
  });

  it("recente não mostra o ícone de relógio", () => {
    render(<MarcadorPosto vm={comPreco} onSelecionar={() => {}} />);
    expect(screen.getByRole("button").querySelector('[data-icone="relogio"]')).toBeNull();
  });

  it("mais barato tem uma seta para baixo, além do verde", () => {
    render(<MarcadorPosto vm={{ ...comPreco, maisBarato: true }} onSelecionar={() => {}} />);
    const botao = screen.getByRole("button");
    expect(botao.getAttribute("data-mais-barato")).toBe("true");
    expect(botao.querySelector('[data-icone="seta-baixo"]')).not.toBeNull();
  });

  it("clicar chama onSelecionar", async () => {
    const onSelecionar = vi.fn();
    render(<MarcadorPosto vm={comPreco} onSelecionar={onSelecionar} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onSelecionar).toHaveBeenCalledTimes(1);
  });
});

describe("MarcadorGrupo", () => {
  it("é um botão 'N postos, aproximar' que mostra a quantidade", async () => {
    const onAproximar = vi.fn();
    render(<MarcadorGrupo quantidade={12} onAproximar={onAproximar} />);
    const botao = screen.getByRole("button", { name: "12 postos, aproximar" });
    expect(botao.textContent).toContain("12");
    await userEvent.click(botao);
    expect(onAproximar).toHaveBeenCalledTimes(1);
  });
});
