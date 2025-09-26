// src/engine/ui/Pointer8.ts
//
// Tiny 8-bit style world pointer system.
// - World-space arrows at (wx, wy) with NES-y pixel blocks.
// - Optional toast attachment that reuses TutorialUI's merge/dedupe logic.
// - Lightweight: call tick() each frame; drawWorld() inside the world transform.
//
// Usage:
//   const id = addPointer({ wx, wy, dir: "S", color: "#7aa2ff" });
//   addPointer({ wx, wy, dir:"N", withToastText:"REACH THIS!", toastDur:2.5 });
//   addPointer({ wx, wy, withToastTokens: UI.tokensGenericMiss(), toastDur:2.2 });
//
// Integration:
//   - In your Scene.update(): P8.tick(1/60)
//   - In your Scene.draw() (inside world transform): P8.drawWorld(ctx, timeSec)
//   - Clear with P8.clear() on level change if desired.

import * as UI from "../scenes/tutorial/TutorialUI";

type Dir = "N" | "S" | "E" | "W";

type Ptr = {
  id: string;
  wx: number;
  wy: number;
  dir: Dir;
  color: string;
  t: number;           // lifetime seconds (for bob/pulse)
  bobAmp: number;      // pixel bob amplitude
  alive: boolean;
};

const pointers: Ptr[] = [];

// ───────────────────────────────────────────────────────────────────────────────
// API
// ───────────────────────────────────────────────────────────────────────────────

export function addPointer(opts: {
  wx: number;
  wy: number;
  dir?: Dir;
  color?: string;
  id?: string;
  bob?: number;
  withToastTokens?: { text: string; color: string }[];
  withToastText?: string;
  toastDur?: number;
}): string {
  const id = opts.id || `p${(Math.random() * 1e9) | 0}`;
  const p: Ptr = {
    id,
    wx: opts.wx | 0,
    wy: opts.wy | 0,
    dir: opts.dir || "S",
    color: opts.color || "#e5e7eb",
    t: 0,
    bobAmp: Math.max(0, Math.min(6, opts.bob ?? 2)),
    alive: true,
  };
  pointers.push(p);

  // Optional combined toast via TutorialUI (uses its merge logic)
  if (opts.withToastTokens && opts.withToastTokens.length) {
    UI.pushWorldToastTokens(opts.withToastTokens, p.wx, p.wy - 10, opts.toastDur ?? 2.0);
  } else if (opts.withToastText) {
    UI.pushWorldToastText(opts.withToastText, p.wx, p.wy - 10, opts.toastDur ?? 2.0);
  }

  return id;
}

export function removePointer(id: string) {
  for (let i = pointers.length; i--; ) {
    if (pointers[i].id === id) {
      pointers.splice(i, 1);
      break;
    }
  }
}

export function clear() { pointers.length = 0; }

export function tick(dt: number) {
  for (const p of pointers) p.t += dt;
}

// ───────────────────────────────────────────────────────────────────────────────
// Drawing
// ───────────────────────────────────────────────────────────────────────────────

export function drawWorld(c: CanvasRenderingContext2D, timeSec: number) {
  // super small 8-bit arrow sprites drawn as blocky rects
  // unit size (pixels per “block”)
  const u = 2; // crisp & tiny
  for (const p of pointers) {
    const pulse = 0.75 + 0.25 * Math.sin((p.t + timeSec) * 6);
    const bob = Math.round(Math.sin((p.t + timeSec) * 4) * p.bobAmp);

    c.save();
    c.translate(p.wx | 0, (p.wy + bob) | 0);
    c.globalAlpha = pulse;

    // shadow
    c.translate(1, 1);
    drawArrowBlocks(c, p.dir, u, "#000");
    c.translate(-1, -1);

    // main
    drawArrowBlocks(c, p.dir, u, p.color);
    c.restore();
  }
}

// NES-y arrow made from a tiny mask per direction (7x7 grid).
// Masks are arrays of y-rows, each row a bitmask of x pixels.
const maskUp: number[] = [
  0b0010000,
  0b0111000,
  0b1111100,
  0b0010000,
  0b0010000,
  0b0010000,
  0b0010000,
];

const maskDown: number[] = [
  0b0010000,
  0b0010000,
  0b0010000,
  0b0010000,
  0b1111100,
  0b0111000,
  0b0010000,
];

const maskLeft: number[] = [
  0b0001000,
  0b0011000,
  0b0111000,
  0b1111110,
  0b0111000,
  0b0011000,
  0b0001000,
];

const maskRight: number[] = [
  0b0010000,
  0b0011000,
  0b0011100,
  0b1111110,
  0b0011100,
  0b0011000,
  0b0010000,
];

function drawArrowBlocks(
  c: CanvasRenderingContext2D,
  dir: Dir,
  u: number,
  col: string
) {
  const mask = dir === "N" ? maskUp
    : dir === "S" ? maskDown
    : dir === "W" ? maskLeft
    : maskRight;

  // center arrow around origin: shift left/up by half sprite
  const size = 7 * u;
  const x0 = -(size >> 1);
  const y0 = -(size >> 1);

  c.fillStyle = col;
  for (let y = 0; y < 7; y++) {
    const row = mask[y];
    for (let x = 0; x < 7; x++) {
      if (row & (1 << (6 - x))) {
        c.fillRect(x0 + x * u, y0 + y * u, u, u);
      }
    }
  }

  // simple 1px outline for extra pop
  c.strokeStyle = "#000";
  c.lineWidth = 1;
  c.strokeRect(x0 - 0.5, y0 - 0.5, size + 1, size + 1);
}

export function getPointerCount() { return pointers.length; }
