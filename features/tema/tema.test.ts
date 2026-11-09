import { describe, expect, it } from "vitest";
import { CHAVE_TEMA, SCRIPT_TEMA, resolverTema } from "./tema";

describe("resolverTema", () => {
  it("a escolha guardada vence a do sistema", () => {
    expect(resolverTema("claro", true)).toBe("claro");
    expect(resolverTema("escuro", false)).toBe("escuro");
  });

  it("sem escolha guardada, segue o sistema", () => {
    expect(resolverTema(null, true)).toBe("escuro");
    expect(resolverTema(null, false)).toBe("claro");
  });

  it("um valor guardado desconhecido é ignorado", () => {
    expect(resolverTema("dark", true)).toBe("escuro");
    expect(resolverTema("", false)).toBe("claro");
  });
});

describe("SCRIPT_TEMA", () => {
  it("lê a mesma chave que o botão grava", () => {
    expect(SCRIPT_TEMA).toContain(`"${CHAVE_TEMA}"`);
  });
});
