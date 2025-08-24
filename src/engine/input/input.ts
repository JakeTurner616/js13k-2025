// src/engine/input/input.ts
// Tiny keyboard input helper:
// ←/→ or A/D = rotate the arc
// ↑/↓ or W/S = adjust power (forward/back)
// Space = jump / hold to aim

const k: Record<number, boolean> = {};
const m = {
  l: [65, 37], // A or Left
  r: [68, 39], // D or Right
  u: [87, 38], // W or Up
  d: [83, 40], // S or Down
  j: [32]      // Space
};

export function setupInput(){
  addEventListener("keydown", e=>k[e.keyCode]=true);
  addEventListener("keyup",   e=>k[e.keyCode]=false);
}

export function getInputState(){
  return {
    left:  m.l.some(c=>k[c]),
    right: m.r.some(c=>k[c]),
    up:    m.u.some(c=>k[c]),
    down:  m.d.some(c=>k[c]),
    jump:  m.j.some(c=>k[c]),
  };
}
