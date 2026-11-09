/**
 * Ícones da identidade visual, com os mesmos traçados do Paper ("00 Fundamentos"). Usam
 * `currentColor` e são decorativos: o texto ao lado sempre diz a mesma coisa (Princípio VII).
 * O `data-icone` identifica cada um nos testes.
 */
import type { SVGProps } from "react";

type PropsIcone = Omit<SVGProps<SVGSVGElement>, "children"> & { espessura?: number };

function base(nome: string, viewBox: string, { className, espessura, ...props }: PropsIcone, padrao: number) {
  return {
    "data-icone": nome,
    viewBox,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: espessura ?? padrao,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
    className,
    ...props,
  };
}

export const IconeSetaBaixo = (p: PropsIcone) => (
  <svg {...base("seta-baixo", "0 0 16 16", p, 2)}>
    <path d="M8 3v9M4 8.5l4 4 4-4" />
  </svg>
);

export const IconeSetaCima = (p: PropsIcone) => (
  <svg {...base("seta-cima", "0 0 16 16", p, 2)}>
    <path d="M8 13V4M4 7.5l4-4 4 4" />
  </svg>
);

export const IconeIgual = (p: PropsIcone) => (
  <svg {...base("igual", "0 0 16 16", p, 2)}>
    <path d="M3 6h10M3 10h10" />
  </svg>
);

export const IconeRelogio = (p: PropsIcone) => (
  <svg {...base("relogio", "0 0 16 16", p, 1.75)}>
    <circle cx="8" cy="8" r="6" />
    <path d="M8 5v3.5l2 1.5" />
  </svg>
);

export const IconeBusca = (p: PropsIcone) => (
  <svg {...base("busca", "0 0 20 20", p, 2)}>
    <circle cx="9" cy="9" r="6" />
    <path d="M13.5 13.5L17 17" />
  </svg>
);

export const IconeLocalizacao = (p: PropsIcone) => (
  <svg {...base("localizacao", "0 0 24 24", p, 2)}>
    <circle cx="12" cy="12" r="6.5" />
    <circle cx="12" cy="12" r="2.25" fill="currentColor" stroke="none" />
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
  </svg>
);

export const IconeLista = (p: PropsIcone) => (
  <svg {...base("lista", "0 0 16 16", p, 1.75)}>
    <path d="M5 4h8M5 8h8M5 12h8" />
    <circle cx="2.5" cy="4" r="1" fill="currentColor" stroke="none" />
    <circle cx="2.5" cy="8" r="1" fill="currentColor" stroke="none" />
    <circle cx="2.5" cy="12" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const IconeMapa = (p: PropsIcone) => (
  <svg {...base("mapa", "0 0 20 20", p, 1.75)}>
    <path d="M2.5 5.2L7.3 3l5.4 2.2L17.5 3v11.8l-4.8 2.2-5.4-2.2-4.8 2.2V5.2z" />
    <path d="M7.3 3v11.8M12.7 5.2V17" />
  </svg>
);

export const IconeMais = (p: PropsIcone) => (
  <svg {...base("mais", "0 0 16 16", p, 1.75)}>
    <path d="M8 3v10M3 8h10" />
  </svg>
);

export const IconeMenos = (p: PropsIcone) => (
  <svg {...base("menos", "0 0 16 16", p, 1.75)}>
    <path d="M3 8h10" />
  </svg>
);

export const IconeLua = (p: PropsIcone) => (
  <svg {...base("lua", "0 0 24 24", p, 2)}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
  </svg>
);

export const IconeSol = (p: PropsIcone) => (
  <svg {...base("sol", "0 0 24 24", p, 2)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
  </svg>
);

export const IconeSemPreco = (p: PropsIcone) => (
  <svg {...base("sem-preco", "0 0 10 10", p, 1.5)}>
    <circle cx="5" cy="5" r="3.5" />
  </svg>
);
