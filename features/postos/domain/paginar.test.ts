import { describe, expect, it } from "vitest";
import { paginarGrupos, textoMostrarMais } from "./paginar";

const grupo = (titulo: string, quantidade: number) => ({
  titulo,
  itens: Array.from({ length: quantidade }, (_, i) => `${titulo}-${i + 1}`),
});

const grupos = [grupo("recente", 3), grupo("antiga", 2), grupo("sem_preco", 2)];

describe("paginarGrupos (D2)", () => {
  it("corta na ordem dos grupos: recente, depois antiga, depois sem preço", () => {
    const { grupos: visiveis, restantes } = paginarGrupos(grupos, 4);
    expect(visiveis).toEqual([
      { titulo: "recente", itens: ["recente-1", "recente-2", "recente-3"] },
      { titulo: "antiga", itens: ["antiga-1"] },
    ]);
    expect(restantes).toBe(3);
  });

  it("omite os grupos que ficaram vazios", () => {
    const { grupos: visiveis } = paginarGrupos(grupos, 3);
    expect(visiveis.map((g) => g.titulo)).toEqual(["recente"]);
  });

  it("com quantidade maior ou igual ao total, devolve tudo e não falta nada", () => {
    expect(paginarGrupos(grupos, 7)).toEqual({ grupos, restantes: 0 });
    expect(paginarGrupos(grupos, 50)).toEqual({ grupos, restantes: 0 });
  });

  it("sem grupos, não há o que mostrar", () => {
    expect(paginarGrupos([], 20)).toEqual({ grupos: [], restantes: 0 });
  });
});

describe("textoMostrarMais (D2)", () => {
  const POSTOS = { singular: "posto", plural: "postos", feminino: false };
  const COLETAS = { singular: "coleta", plural: "coletas", feminino: true };

  it("mais que uma página: quantos aparecem e quantos faltam", () => {
    expect(textoMostrarMais(123, 20, POSTOS)).toBe("Mostrar mais 20 (faltam 123)");
    expect(textoMostrarMais(30, 10, COLETAS)).toBe("Mostrar mais 10 (faltam 30)");
  });

  it("até uma página: mostra os restantes", () => {
    expect(textoMostrarMais(20, 20, POSTOS)).toBe("Mostrar os 20 postos restantes");
    expect(textoMostrarMais(5, 20, POSTOS)).toBe("Mostrar os 5 postos restantes");
    expect(textoMostrarMais(4, 10, COLETAS)).toBe("Mostrar as 4 coletas restantes");
  });

  it("só um: o último", () => {
    expect(textoMostrarMais(1, 20, POSTOS)).toBe("Mostrar o último posto");
    expect(textoMostrarMais(1, 10, COLETAS)).toBe("Mostrar a última coleta");
  });
});
