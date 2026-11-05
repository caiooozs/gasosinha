/** Atribuição permanente das fontes na tela do mapa (FR-030). Texto fixo, sempre visível. */
export function AtribuicaoFontes() {
  const link = "underline underline-offset-2 hover:text-foreground focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring";
  return (
    <p className="text-xs text-muted-foreground">
      Preços: ANP – Levantamento de Preços de Combustíveis · Mapa: ©{" "}
      <a className={link} href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
        OpenStreetMap
      </a>
      ,{" "}
      <a className={link} href="https://openfreemap.org" target="_blank" rel="noreferrer">
        OpenFreeMap
      </a>
    </p>
  );
}
