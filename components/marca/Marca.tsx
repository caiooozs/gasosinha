import { cn } from "cn";
import Image from "next/image";

/**
 * Logotipo "gasosinha": o nome em Geist com o quadradinho amarelo da marca. É texto, então segue
 * o tema sozinho e é lido como o nome do produto.
 */
export function Logotipo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-[20px] leading-none font-bold tracking-[-0.035em] text-ink", className)}>
      <span aria-hidden="true" className="size-2.5 shrink-0 rounded-[3px] bg-yellow" />
      gasosinha
    </span>
  );
}

/**
 * As poses do mascote (arte em public/gasosinha/), usadas nos estados da tela do mapa e nas
 * reações do detalhe do posto. Cada uma tem a versão para o tema escuro, sem a sombra clara no chão.
 */
const POSES = {
  correndo: { arquivo: "gasosinha-correndo", width: 184, height: 175 },
  feliz: { arquivo: "gasosinha-feliz", width: 199, height: 193 },
  mapa: { arquivo: "gasosinha-mapa", width: 180, height: 176 },
  pensando: { arquivo: "gasosinha-pensando", width: 189, height: 190 },
  piscando: { arquivo: "gasosinha-piscando", width: 198, height: 190 },
  preco: { arquivo: "gasosinha-preco", width: 243, height: 169 },
  surpreso: { arquivo: "gasosinha-surpreso", width: 176, height: 173 },
} as const;

export type NomePose = keyof typeof POSES;

/**
 * O Gasosinha numa pose. É decorativo (`alt=""`): o texto ao lado sempre diz tudo sozinho, e a
 * pose só acompanha (identidade visual, "05 Estados com o Gasosinha"). A versão certa aparece pela
 * classe `dark` do <html>, já antes da hidratação.
 */
export function PoseGasosinha({ pose, className }: { pose: NomePose; className?: string }) {
  const { arquivo, width, height } = POSES[pose];
  return (
    <>
      <Image
        src={`/gasosinha/${arquivo}.png`}
        alt=""
        width={width}
        height={height}
        className={cn("shrink-0 object-contain dark:hidden", className)}
      />
      <Image
        src={`/gasosinha/${arquivo}-dark.png`}
        alt=""
        width={width}
        height={height}
        className={cn("hidden shrink-0 object-contain dark:block", className)}
      />
    </>
  );
}
