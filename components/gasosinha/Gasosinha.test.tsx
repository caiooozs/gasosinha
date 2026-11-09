import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Reacao } from "@/features/gasosinha/domain/reacao";
import { Gasosinha } from "./Gasosinha";

const POSES: Record<Reacao, string> = {
  subiu: "gasosinha-surpreso",
  caiu: "gasosinha-feliz",
  estavel: "gasosinha-piscando",
  neutro: "gasosinha-pensando",
};

/** O caminho da imagem, mesmo quando o next/image o embrulha em /_next/image?url=…. */
function caminhos(container: HTMLElement): string[] {
  return [...container.querySelectorAll("img")].map((img) => decodeURIComponent(img.getAttribute("src") ?? ""));
}

describe("Gasosinha", () => {
  it.each(Object.entries(POSES) as [Reacao, string][])(
    "a reação %s usa a pose %s, nas versões clara e escura, como imagem decorativa",
    (reacao, pose) => {
      const { container } = render(<Gasosinha reacao={reacao} texto="Texto da reação" parado={false} />);
      const fontes = caminhos(container);
      expect(fontes).toHaveLength(2);
      expect(fontes.some((f) => f.includes(`/gasosinha/${pose}.png`))).toBe(true);
      expect(fontes.some((f) => f.includes(`/gasosinha/${pose}-dark.png`))).toBe(true);
      for (const img of container.querySelectorAll("img")) expect(img.getAttribute("alt")).toBe("");
    },
  );

  it("o texto fica visível e é anunciado sem interromper (FR-019)", () => {
    render(<Gasosinha reacao="subiu" texto="Subiu R$ 0,10 (+1,5%) desde 13/10/2026" parado={false} />);
    const texto = screen.getByText("Subiu R$ 0,10 (+1,5%) desde 13/10/2026");
    expect(texto.closest("[aria-live='polite']")).not.toBeNull();
  });

  it("sem parado, a pose faz o pulinho", () => {
    const { container } = render(<Gasosinha reacao="caiu" texto="Caiu" parado={false} />);
    const animado = container.querySelector("[data-parado]");
    expect(animado?.getAttribute("data-parado")).toBe("false");
    expect(animado?.classList.contains("animate-pulinho")).toBe(true);
  });

  it("com parado, a mesma pose fica fixa e o texto continua igual (FR-020)", () => {
    const { container } = render(<Gasosinha reacao="caiu" texto="Caiu" parado />);
    const animado = container.querySelector("[data-parado]");
    expect(animado?.getAttribute("data-parado")).toBe("true");
    expect(animado?.className).not.toMatch(/animate-/);
    expect(caminhos(container).some((f) => f.includes("/gasosinha/gasosinha-feliz.png"))).toBe(true);
    expect(screen.getByText("Caiu")).toBeTruthy();
  });
});
