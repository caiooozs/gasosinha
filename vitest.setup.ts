import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Sem `globals: true`, o Testing Library não desmonta os componentes sozinho entre os testes.
afterEach(() => {
  cleanup();
});

// O jsdom não implementa matchMedia; os componentes o usam para ler a largura da tela e
// "reduzir movimento". Nos testes, nenhuma consulta casa.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (consulta: string): MediaQueryList => ({
    matches: false,
    media: consulta,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

// O jsdom não implementa a captura de ponteiro, que a folha arrastável do celular (vaul) usa ao
// tocar nela (D9). Nos testes, não há arraste: basta não quebrar.
if (typeof Element !== "undefined" && !Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.hasPointerCapture = () => false;
}
