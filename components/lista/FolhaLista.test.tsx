import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FolhaLista } from "./FolhaLista";

const props = {
  id: "folha",
  altura: "meia" as const,
  onMudarAltura: () => {},
  onFechar: () => {},
  cabecalho: <span>cabeçalho</span>,
};

describe("FolhaLista (D9)", () => {
  it("aberta: é uma folha nomeada pelos postos da área, com o cabeçalho e a lista", () => {
    render(
      <FolhaLista {...props}>
        <p>lista de postos</p>
      </FolhaLista>,
    );
    const folha = screen.getByRole("dialog", { name: "Postos da área visível" });
    expect(folha.textContent).toContain("cabeçalho");
    expect(folha.textContent).toContain("lista de postos");
  });

  it("na metade, não cobre o mapa: não há sobreposição escurecendo o fundo", () => {
    render(<FolhaLista {...props}>lista</FolhaLista>);
    expect(document.querySelector("[data-vaul-overlay]")).toBeNull();
  });

  it("fechada, não aparece", () => {
    render(<FolhaLista {...props} altura="fechada">lista</FolhaLista>);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("'Fechar lista' fecha", async () => {
    const onFechar = vi.fn();
    render(
      <FolhaLista {...props} onFechar={onFechar}>
        lista
      </FolhaLista>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Fechar lista" }));
    expect(onFechar).toHaveBeenCalled();
  });
});
