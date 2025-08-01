const k: Record<number, boolean> = {};
const m = {
  l: [65, 37], r: [68, 39], // A/D or arrows
  u: [87, 38], d: [83, 40], // W/S or arrows
  j: [32]                   // space
};

export function setupInput() {
  addEventListener("keydown", e => k[e.keyCode] = true);
  addEventListener("keyup", e => k[e.keyCode] = false);
}

export function getInputState() {
  return {
    left:  m.l.some(c => k[c]),
    right: m.r.some(c => k[c]),
    up:    m.u.some(c => k[c]),
    down:  m.d.some(c => k[c]),
    jump:  m.j.some(c => k[c]),
  };
}