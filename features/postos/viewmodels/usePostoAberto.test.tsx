import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePostoAberto } from "./usePostoAberto";

let rota = "/";
vi.mock("next/navigation", () => ({ usePathname: () => rota }));

describe("usePostoAberto (D5)", () => {
  it("na rota de um posto, devolve o CNPJ dele", () => {
    rota = "/postos/08192593000147";
    expect(renderHook(() => usePostoAberto()).result.current).toBe("08192593000147");
  });

  it("fora da rota de um posto, ou com um CNPJ malformado, não há posto aberto", () => {
    rota = "/";
    expect(renderHook(() => usePostoAberto()).result.current).toBeNull();
    rota = "/postos/abc";
    expect(renderHook(() => usePostoAberto()).result.current).toBeNull();
  });
});
