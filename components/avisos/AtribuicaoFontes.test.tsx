import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AtribuicaoFontes } from "./AtribuicaoFontes";

describe("AtribuicaoFontes", () => {
  it("a linha curta do celular mantém a fonte dos preços e os créditos do mapa, com links (D9; Princípio I, FR-030)", () => {
    render(<AtribuicaoFontes variante="linha" atualizadoEm={null} />);
    const texto = document.body.textContent ?? "";
    expect(texto).toContain("Preços: ANP");
    expect(screen.getByRole("link", { name: "OpenFreeMap" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "OpenMapTiles" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "OpenStreetMap" })).toBeTruthy();
  });
});
