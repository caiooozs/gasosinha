import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const raiz = fileURLToPath(new URL(".", import.meta.url)).replace(/[\\/]$/, "");

export default defineConfig({
  resolve: {
    // Mesmo alias do tsconfig: "@/x" aponta para "./x". Pacotes com escopo (@supabase/...) não casam.
    alias: [{ find: /^@\//, replacement: `${raiz}/` }],
  },
  // JSX automático (react-jsx), sem precisar de plugin. No Vite 8, a opção `esbuild` deu lugar a `oxc`.
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    // Enquanto as primeiras tasks de teste não existem, `npm test` não deve falhar por falta de arquivos.
    passWithNoTests: true,
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: [
            "features/**/*.test.ts",
            "lib/**/*.test.ts",
            "supabase/functions/_shared/**/*.test.ts",
          ],
        },
      },
      {
        extends: true,
        test: {
          name: "jsdom",
          environment: "jsdom",
          include: ["features/**/*.test.tsx", "components/**/*.test.tsx"],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
    ],
  },
});
