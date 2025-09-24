// src/engine/font/fontEngine.ts
// 5x7 pixel font renderer with graceful fallbacks for missing glyphs.
// - Uses generated glyphs/data from procFont.ts for known characters.
// - Adds runtime fallback bitmaps for characters our font set was missing:
//   B, J, V, W, X, '(', ')', '&', '+', '•', '|', '.', ',', '-', '?', and arrows '←', '→'.
// - All glyphs are normalized to the same 5x7 cell and 1px spacing so sizing is uniform.
// - If a character is still unknown, draws a small outlined box placeholder.
//
// Encoding/bit-order matches procFont:
// Row-major (top→bottom), each row left→right, total 35 bits.
// drawChar iterates with b from 34 down to 0, mirroring the data packer.

import { glyphs, data } from "./procFont";

const CELL_W = 5;
const CELL_H = 7;
const ADVANCE = CELL_W + 1; // 1px spacing
const BITS = CELL_W * CELL_H; // 35

// --- Fallback 5x7 bitmaps (strings of '0'/'1'), row-major top→bottom.
const EXTRA_ROWS: Record<string, string[]> = {
  // Letters we use but were missing in the generated set
  "B": [
    "11110",
    "10001",
    "10001",
    "11111",
    "10001",
    "10001",
    "11110",
  ],
  "J": [
    "01111",
    "00010",
    "00010",
    "00010",
    "00010",
    "10010",
    "01100",
  ],
  "V": [
    "10001",
    "10001",
    "10001",
    "10001",
    "10001",
    "01010",
    "00100",
  ],
  "W": [
    "10001",
    "10001",
    "10101",
    "10101",
    "10101",
    "10101",
    "01010",
  ],
  "X": [
    "10001",
    "01010",
    "01010",
    "00100",
    "01010",
    "01010",
    "10001",
  ],

  // Punctuation / symbols commonly used in prompts & toasts
  ".": [
    "00000",
    "00000",
    "00000",
    "00000",
    "00100",
    "00100",
    "00000",
  ],
  ",": [
    "00000",
    "00000",
    "00000",
    "00000",
    "00100",
    "00100",
    "01000",
  ],
  "-": [
    "00000",
    "00000",
    "00000",
    "01110",
    "00000",
    "00000",
    "00000",
  ],
  "?": [
    "01110",
    "10001",
    "00010",
    "00100",
    "00100",
    "00000",
    "00100",
  ],
  "(": [
    "00110",
    "01000",
    "01000",
    "01000",
    "01000",
    "00110",
    "00000",
  ],
  ")": [
    "01100",
    "00010",
    "00010",
    "00010",
    "00010",
    "01100",
    "00000",
  ],
  "&": [
    "01100",
    "10010",
    "10100",
    "01000",
    "10101",
    "10010",
    "01101",
  ],
  "+": [
    "00100",
    "00100",
    "11111",
    "00100",
    "00100",
    "00000",
    "00000",
  ],
  "|": [
    "00100",
    "00100",
    "00100",
    "00100",
    "00100",
    "00100",
    "00000",
  ],
  "•": [
    "00000",
    "00100",
    "01110",
    "01110",
    "00100",
    "00000",
    "00000",
  ],

  // Unicode arrows used in prompts
  "←": [
    "00000",
    "00100",
    "01000",
    "11111",
    "01000",
    "00100",
    "00000",
  ],
  "→": [
    "00000",
    "00100",
    "00010",
    "11111",
    "00010",
    "00100",
    "00000",
  ],
  "↓": [
    "00100",
    "00100",
    "00100",
    "00100",
    "10101",
    "01010",
    "00100",
  ],
};

// Convert 7x(5 bits) rows into a 35-bit integer → base36 string (padded to 7 chars)
function rowsTo36(rows: string[]): string {
  let v = 0n;
  let bit = BITS - 1; // 34..0
  for (let y = 0; y < CELL_H; y++) {
    const row = rows[y] || "00000";
    for (let x = 0; x < CELL_W; x++, bit--) {
      if (row.charCodeAt(x) === 49 /* '1' */) {
        v |= 1n << BigInt(bit);
      }
    }
  }
  // Pad to 7 base36 chars to match procFont packing
  let s = v.toString(36);
  while (s.length < 7) s = "0" + s;
  return s;
}

// Precompute base36 strings for fallbacks once.
const EXTRA36: Record<string, string> = {};
for (const k in EXTRA_ROWS) EXTRA36[k] = rowsTo36(EXTRA_ROWS[k]);

// Draw a simple 5x7 outlined box placeholder for unknown glyphs.
function drawMissingBox(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  scale: number,
  color: string
) {
  ctx.fillStyle = color;
  for (let x = 0; x < CELL_W; x++) {
    ctx.fillRect(px + x * scale, py + 0 * scale, scale, scale);
    ctx.fillRect(px + x * scale, py + (CELL_H - 1) * scale, scale, scale);
  }
  for (let y = 1; y < CELL_H - 1; y++) {
    ctx.fillRect(px + 0 * scale, py + y * scale, scale, scale);
    ctx.fillRect(px + (CELL_W - 1) * scale, py + y * scale, scale, scale);
  }
}

export function drawChar(
  ctx: CanvasRenderingContext2D,
  ch: string,
  px: number,
  py: number,
  scale = 2,
  color = "#fff"
) {
  // Fast path: space
  if (ch === " ") return;

  // Prefer generated glyphs
  const idx = glyphs.indexOf(ch);
  let packed: string | null = null;

  if (idx >= 0) {
    packed = data.slice(idx * 7, idx * 7 + 7);
  } else if (EXTRA36[ch]) {
    packed = EXTRA36[ch];
  }

  if (!packed) {
    // Unknown even after fallbacks → placeholder box
    drawMissingBox(ctx, px, py, scale, color);
    return;
  }

  const v = BigInt(parseInt(packed, 36));
  ctx.fillStyle = color;

  // Unpack and draw bits, row-major 5x7
  let b = BITS - 1;
  for (let y = 0; y < CELL_H; y++) {
    for (let x = 0; x < CELL_W; x++, b--) {
      if ((v >> BigInt(b)) & 1n) {
        ctx.fillRect(px + x * scale, py + y * scale, scale, scale);
      }
    }
  }
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  scale = 2,
  color = "#fff"
) {
  for (let i = 0; i < str.length; i++) {
    const raw = str[i];
    // Keep arrows/punctuation as-is, but uppercase ASCII letters for our 5x7 set
    const ch = /[a-z]/.test(raw) ? raw.toUpperCase() : raw;
    drawChar(ctx, ch, x + i * ADVANCE * scale, y, scale, color);
  }
}
