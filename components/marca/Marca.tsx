import { cn } from "cn";
import Image from "next/image";

/** Logotipo "Gasosinha" (pixel art). É o nome do produto: tem texto alternativo. */
export function Logotipo({ className, prioridade = false }: { className?: string; prioridade?: boolean }) {
  return (
    <Image
      src="/gasosinha/gasosinha-wordmark.png"
      alt="Gasosinha"
      width={496}
      height={149}
      priority={prioridade}
      className={cn("h-[34px] w-auto object-contain object-left", className)}
    />
  );
}

/** As poses do mascote usadas nos estados da tela do mapa (arte em public/gasosinha/). */
const POSES = {
  correndo: { src: "/gasosinha/gasosinha-correndo.png", width: 184, height: 175 },
  mapa: { src: "/gasosinha/gasosinha-mapa.png", width: 180, height: 176 },
  pensando: { src: "/gasosinha/gasosinha-pensando.png", width: 189, height: 190 },
  preco: { src: "/gasosinha/gasosinha-preco.png", width: 243, height: 169 },
} as const;

export type NomePose = keyof typeof POSES;

/**
 * O Gasosinha numa pose. É decorativo (`alt=""`): o texto ao lado sempre diz tudo sozinho, e a
 * pose só acompanha (identidade visual, "05 Estados com o Gasosinha").
 */
export function PoseGasosinha({ pose, className }: { pose: NomePose; className?: string }) {
  const { src, width, height } = POSES[pose];
  return <Image src={src} alt="" width={width} height={height} className={cn("shrink-0 object-contain", className)} />;
}
