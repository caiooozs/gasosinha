import Link from "next/link";
import { BOTAO_PRIMARIO, EstadoGasosinha } from "@/components/estados/EstadoGasosinha";

/** CNPJ inexistente (casos de borda, "Link de posto inexistente"): mensagem e caminho de volta ao mapa. */
export default function PostoNaoEncontrado() {
  return (
    <main className="m-auto w-full max-w-sm">
      <EstadoGasosinha
        pose="pensando"
        titulo="Posto não encontrado"
        texto="Este link não corresponde a nenhum posto do cadastro da ANP na Região Metropolitana do Recife."
        acao={
          <Link href="/" className={BOTAO_PRIMARIO}>
            Voltar ao mapa
          </Link>
        }
      />
    </main>
  );
}
