import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Sem `globals: true`, o Testing Library não desmonta os componentes sozinho entre os testes.
afterEach(() => {
  cleanup();
});
