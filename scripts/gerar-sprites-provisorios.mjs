// Gera os sprite sheets PROVISÓRIOS do Gasosinha em public/gasosinha/ (T008).
//
// Cada arquivo tem 4 quadros de 32×32 px lado a lado (128×32), animados no CSS com steps(4).
// Cada reação tem silhueta e símbolo próprios, para a informação não depender só de cor
// (Princípio VII):
//   subiu   → gota esticada, seta para cima
//   caiu    → gota achatada, seta para baixo
//   estavel → gota média, traço
//   neutro  → corpo redondo, círculo
//
// A arte final é insumo externo e substitui estes arquivos com as mesmas dimensões.
// Uso: node scripts/gerar-sprites-provisorios.mjs

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const QUADRO = 32;
const QUADROS = 4;
const LARGURA = QUADRO * QUADROS;
const ALTURA = QUADRO;

const TRANSPARENTE = [0, 0, 0, 0];
const CONTORNO = [31, 41, 55, 255];
const BRANCO = [255, 255, 255, 255];
const PUPILA = [17, 24, 39, 255];

// Formas: elipse de raios rx × ry centrada em cy, mais a ponta (só na gota) a partir de pontaY.
const REACOES = {
  subiu: { cor: [220, 38, 38, 255], forma: { tipo: "gota", cy: 19, rx: 8, ry: 8, pontaY: 2 }, simbolo: "setaCima" },
  caiu: { cor: [22, 163, 74, 255], forma: { tipo: "gota", cy: 22, rx: 12, ry: 8, pontaY: 10 }, simbolo: "setaBaixo" },
  estavel: { cor: [37, 99, 235, 255], forma: { tipo: "gota", cy: 20, rx: 9, ry: 9, pontaY: 5 }, simbolo: "traco" },
  neutro: { cor: [107, 114, 128, 255], forma: { tipo: "redondo", cy: 17, rx: 10, ry: 10 }, simbolo: "circulo" },
};

// Deslocamento vertical de cada quadro: o mascote balança 1 px para cima e para baixo.
const BALANCO = [0, -1, 0, 1];

// Símbolos 5×5 ("#" = pixel branco), desenhados no centro do corpo.
const SIMBOLOS = {
  setaCima: ["..#..", ".###.", "#.#.#", "..#..", "..#.."],
  setaBaixo: ["..#..", "..#..", "#.#.#", ".###.", "..#.."],
  traco: [".....", ".....", "#####", "#####", "....."],
  circulo: [".###.", "#...#", "#...#", "#...#", ".###."],
};

function dentroDaForma(forma, cx, x, y) {
  const dx = x - cx;
  const dy = y - forma.cy;
  if ((dx / forma.rx) ** 2 + (dy / forma.ry) ** 2 <= 1) return true;
  if (forma.tipo !== "gota") return false;
  // Ponta da gota: triângulo que vai da ponta até a altura do centro da elipse.
  if (y < forma.pontaY || y > forma.cy) return false;
  const meiaLargura = ((y - forma.pontaY) / (forma.cy - forma.pontaY)) * forma.rx;
  return Math.abs(dx) <= meiaLargura;
}

function desenharQuadro(pixels, reacao, indice) {
  const { cor, forma: base, simbolo } = REACOES[reacao];
  const deslocamento = BALANCO[indice];
  const forma = {
    ...base,
    cy: base.cy + deslocamento,
    pontaY: base.pontaY === undefined ? undefined : base.pontaY + deslocamento,
  };
  const x0 = indice * QUADRO;
  const cx = x0 + QUADRO / 2 - 0.5;

  const dentro = (x, y) => x >= x0 && x < x0 + QUADRO && dentroDaForma(forma, cx, x, y);

  // Corpo com contorno: pixel dentro da forma com algum vizinho fora vira contorno.
  for (let y = 0; y < ALTURA; y++) {
    for (let x = x0; x < x0 + QUADRO; x++) {
      if (!dentro(x, y)) continue;
      const borda = !dentro(x - 1, y) || !dentro(x + 1, y) || !dentro(x, y - 1) || !dentro(x, y + 1);
      pintar(pixels, x, y, borda ? CONTORNO : cor);
    }
  }

  // Olhos 2×2, com pupila no canto de baixo.
  const olhoY = forma.cy - 5;
  for (const lado of [-4, 2]) {
    const ox = Math.round(cx) + lado;
    pintar(pixels, ox, olhoY, BRANCO);
    pintar(pixels, ox + 1, olhoY, BRANCO);
    pintar(pixels, ox, olhoY + 1, BRANCO);
    pintar(pixels, ox + 1, olhoY + 1, PUPILA);
  }

  // Símbolo da reação, abaixo dos olhos.
  const desenho = SIMBOLOS[simbolo];
  const sx = Math.round(cx) - 2;
  const sy = forma.cy - 1;
  desenho.forEach((linha, dy) => {
    [...linha].forEach((c, dx) => {
      if (c === "#") pintar(pixels, sx + dx, sy + dy, BRANCO);
    });
  });
}

function pintar(pixels, x, y, [r, g, b, a]) {
  if (x < 0 || x >= LARGURA || y < 0 || y >= ALTURA) return;
  const i = (y * LARGURA + x) * 4;
  pixels[i] = r;
  pixels[i + 1] = g;
  pixels[i + 2] = b;
  pixels[i + 3] = a;
}

// --- PNG (RGBA 8 bits, sem filtro), escrito à mão com node:zlib ---

const TABELA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes) {
  let c = 0xffffffff;
  for (const byte of bytes) c = TABELA_CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function bloco(tipo, dados) {
  const tipoEDados = Buffer.concat([Buffer.from(tipo, "ascii"), dados]);
  const tamanho = Buffer.alloc(4);
  tamanho.writeUInt32BE(dados.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(tipoEDados));
  return Buffer.concat([tamanho, tipoEDados, crc]);
}

function codificarPng(pixels, largura, altura) {
  const cabecalho = Buffer.alloc(13);
  cabecalho.writeUInt32BE(largura, 0);
  cabecalho.writeUInt32BE(altura, 4);
  cabecalho[8] = 8; // bits por canal
  cabecalho[9] = 6; // RGBA
  cabecalho[10] = 0;
  cabecalho[11] = 0;
  cabecalho[12] = 0;

  const linhas = Buffer.alloc((largura * 4 + 1) * altura);
  for (let y = 0; y < altura; y++) {
    const inicio = y * (largura * 4 + 1);
    linhas[inicio] = 0; // filtro "nenhum"
    Buffer.from(pixels.buffer, y * largura * 4, largura * 4).copy(linhas, inicio + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco("IHDR", cabecalho),
    bloco("IDAT", deflateSync(linhas)),
    bloco("IEND", Buffer.alloc(0)),
  ]);
}

const destino = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "gasosinha");
mkdirSync(destino, { recursive: true });

for (const reacao of Object.keys(REACOES)) {
  const pixels = new Uint8Array(LARGURA * ALTURA * 4);
  for (let i = 0; i < LARGURA * ALTURA; i++) pintar(pixels, i % LARGURA, Math.floor(i / LARGURA), TRANSPARENTE);
  for (let q = 0; q < QUADROS; q++) desenharQuadro(pixels, reacao, q);
  const arquivo = join(destino, `${reacao}.png`);
  writeFileSync(arquivo, codificarPng(pixels, LARGURA, ALTURA));
  console.log(`gerado ${arquivo} (${LARGURA}×${ALTURA})`);
}
