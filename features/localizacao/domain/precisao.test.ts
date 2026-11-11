import { describe, expect, it } from "vitest";
import { raioEmPixels } from "./precisao";

describe("raioEmPixels (halo da precisão, D7)", () => {
  it("converte a precisão em metros no raio em pixels, no zoom e na latitude do mapa", () => {
    // No equador, no zoom 16, cada pixel do MapLibre (tiles de 512 px) vale ~1,19 m.
    expect(raioEmPixels(100, 0, 16)).toBeCloseTo(83.7, 1);
  });

  it("um zoom a mais dobra o raio, e longe do equador o pixel vale menos metros", () => {
    expect(raioEmPixels(100, 0, 17)).toBeCloseTo(2 * raioEmPixels(100, 0, 16), 5);
    expect(raioEmPixels(100, -8.05, 16)).toBeGreaterThan(raioEmPixels(100, 0, 16));
  });

  it("precisão inválida ou zero não desenha halo", () => {
    expect(raioEmPixels(0, -8.05, 15)).toBe(0);
    expect(raioEmPixels(Number.NaN, -8.05, 15)).toBe(0);
  });
});
