import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BotaoLocalizacao } from "./BotaoLocalizacao";

const PARADO = { seguindo: false, pedindo: false, resultado: null } as const;

describe("BotaoLocalizacao (D7)", () => {
  it("é um botão de alternar que diz se o mapa está seguindo a pessoa (aria-pressed)", async () => {
    const onUsar = vi.fn();
    const { rerender } = render(<BotaoLocalizacao estado={PARADO} onUsar={onUsar} />);
    const botao = screen.getByRole("button", { name: "Usar minha localização" });
    expect(botao.getAttribute("aria-pressed")).toBe("false");
    await userEvent.click(botao);
    expect(onUsar).toHaveBeenCalledTimes(1);
    rerender(<BotaoLocalizacao estado={{ ...PARADO, seguindo: true, resultado: "centralizado" }} onUsar={onUsar} />);
    expect(botao.getAttribute("aria-pressed")).toBe("true");
  });

  it("enquanto pede a localização, fica ocupado", () => {
    render(<BotaoLocalizacao estado={{ ...PARADO, pedindo: true }} onUsar={() => {}} />);
    expect(screen.getByRole("button", { name: "Usar minha localização" }).getAttribute("aria-busy")).toBe("true");
  });

  it("mostra o aviso de localização negada, indisponível ou fora da área (FR-005)", () => {
    const { rerender } = render(<BotaoLocalizacao estado={{ ...PARADO, resultado: "negado" }} onUsar={() => {}} />);
    expect(screen.getByRole("status").textContent).toBe("Localização não permitida. O mapa continua na região padrão.");
    rerender(<BotaoLocalizacao estado={{ ...PARADO, resultado: "fora_da_regiao" }} onUsar={() => {}} />);
    expect(screen.getByRole("status").textContent).toBe("Você está fora da área coberta");
  });

  it("no celular é redondo, só com o ícone, e o mesmo nome acessível", () => {
    render(<BotaoLocalizacao variante="redondo" estado={PARADO} onUsar={() => {}} />);
    const botao = screen.getByRole("button", { name: "Usar minha localização" });
    expect(botao.textContent).toBe("");
  });
});
