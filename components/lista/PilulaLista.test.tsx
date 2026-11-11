import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BotaoRecolherLista, PilulaCelular, PilulaLista, type PilulaCelularProps } from "./PilulaLista";

describe("PilulaCelular (D9)", () => {
  const base: PilulaCelularProps = {
    titulo: "8 postos",
    estado: "pronto",
    vazia: false,
    aberta: false,
    controla: "folha",
    onAbrir: () => {},
    onBuscar: () => {},
    onTentarDeNovo: () => {},
    onVerRegiaoInteira: () => {},
  };

  it("com postos: a contagem curta abre a lista, dizendo se ela está aberta; a busca fica ao lado", async () => {
    const onAbrir = vi.fn();
    const onBuscar = vi.fn();
    const { rerender } = render(<PilulaCelular {...base} onAbrir={onAbrir} onBuscar={onBuscar} />);
    const abrir = screen.getByRole("button", { name: "8 postos · Ver lista" });
    expect(abrir.getAttribute("aria-expanded")).toBe("false");
    expect(abrir.getAttribute("aria-controls")).toBe("folha");
    await userEvent.click(abrir);
    expect(onAbrir).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "Buscar cidade da região" }));
    expect(onBuscar).toHaveBeenCalledTimes(1);
    rerender(<PilulaCelular {...base} aberta />);
    expect(screen.getByRole("button", { name: "8 postos · Ver lista" }).getAttribute("aria-expanded")).toBe("true");
  });

  it("carregando: avisa sem interromper, em role=status", () => {
    render(<PilulaCelular {...base} estado="carregando" vazia />);
    expect(screen.getByRole("status").textContent).toBe("Buscando os preços…");
    expect(screen.queryByRole("button", { name: /Ver lista/ })).toBeNull();
  });

  it("vazio: 'Nenhum posto aqui', com 'Ver a região inteira'", async () => {
    const onVerRegiaoInteira = vi.fn();
    render(<PilulaCelular {...base} vazia onVerRegiaoInteira={onVerRegiaoInteira} />);
    expect(screen.getByText("Nenhum posto aqui")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Ver a região inteira" }));
    expect(onVerRegiaoInteira).toHaveBeenCalledTimes(1);
  });

  it("erro sem postos: alerta, com 'Tentar de novo'", async () => {
    const onTentarDeNovo = vi.fn();
    render(<PilulaCelular {...base} estado="erro" vazia onTentarDeNovo={onTentarDeNovo} />);
    expect(screen.getByRole("alert").textContent).toContain("Não deu para carregar");
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(onTentarDeNovo).toHaveBeenCalledTimes(1);
  });

  it("erro com postos anteriores: a lista continua abrível", () => {
    render(<PilulaCelular {...base} estado="erro" />);
    expect(screen.getByRole("button", { name: "8 postos · Ver lista" })).toBeTruthy();
  });
});

describe("PilulaLista (D6)", () => {
  it("mostra a contagem da área e abre a lista, dizendo que ela está fechada", async () => {
    const onExpandir = vi.fn();
    render(<PilulaLista titulo="360 postos nesta área" controla="lista" onExpandir={onExpandir} onBuscar={() => {}} />);
    const abrir = screen.getByRole("button", { name: /360 postos nesta área · Ver lista/ });
    expect(abrir.getAttribute("aria-expanded")).toBe("false");
    expect(abrir.getAttribute("aria-controls")).toBe("lista");
    await userEvent.click(abrir);
    expect(onExpandir).toHaveBeenCalledTimes(1);
  });

  it("a busca de cidade continua alcançável com a lista recolhida", async () => {
    const onBuscar = vi.fn();
    render(<PilulaLista titulo="360 postos nesta área" controla="lista" onExpandir={() => {}} onBuscar={onBuscar} />);
    await userEvent.click(screen.getByRole("button", { name: "Buscar cidade da região" }));
    expect(onBuscar).toHaveBeenCalledTimes(1);
  });
});

describe("BotaoRecolherLista (D6)", () => {
  it("tem nome acessível, diz que a lista está aberta e recolhe", async () => {
    const onRecolher = vi.fn();
    render(<BotaoRecolherLista controla="lista" onRecolher={onRecolher} />);
    const botao = screen.getByRole("button", { name: "Recolher lista" });
    expect(botao.getAttribute("aria-expanded")).toBe("true");
    expect(botao.getAttribute("aria-controls")).toBe("lista");
    await userEvent.click(botao);
    expect(onRecolher).toHaveBeenCalledTimes(1);
  });
});
