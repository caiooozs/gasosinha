/**
 * Tema claro ou escuro (identidade visual, "Glass e modo escuro"). A escolha manual fica no
 * localStorage; sem ela, vale a preferência do sistema. A classe `dark` no <html> liga os tokens
 * escuros do `app/globals.css`.
 */
export const CHAVE_TEMA = "gasosinha-tema";

export type Tema = "claro" | "escuro";

/** A escolha guardada vence; sem ela (ou com um valor desconhecido), segue o sistema. */
export function resolverTema(guardado: string | null, sistemaEscuro: boolean): Tema {
  if (guardado === "claro" || guardado === "escuro") return guardado;
  return sistemaEscuro ? "escuro" : "claro";
}

/**
 * Roda no <head>, antes da primeira pintura, para a página não piscar no tema claro (guia
 * "Preventing Flash" do Next). Aplica a mesma regra de `resolverTema`.
 */
export const SCRIPT_TEMA = `(function(){try{var t=localStorage.getItem("${CHAVE_TEMA}");var e=t==="escuro"||(t!=="claro"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",e)}catch(_){}})()`;
