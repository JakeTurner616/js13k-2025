// src/engine/input/input.ts
// Keyboard + Gamepad input helper with ANALOG aiming and PORTAL shooting.
// ←/→ or A/D (or Left Stick X) = rotate the arc
// S/↓ (or Left Stick Down) = reduce power; auto-charge continues as before
// Space / A (Cross) = jump / hold to aim
// R / Start (Options/Share) / Triangle(Y) = reset
// 🆕 Right Stick aims portals; RT = Blue (A), LT = Orange (B)

type Source = "kbd" | "gp";

// ──────────────────────────────────────────────────────────────────────────────
// Keyboard state
// ──────────────────────────────────────────────────────────────────────────────
const k: Record<number, boolean> = {};
const m = {
  l: [65, 37], // A or Left
  r: [68, 39], // D or Right
  u: [87, 38], // W or Up
  d: [83, 40], // S or Down
  j: [32],     // Space
  rs:[82]      // R (reset)
};

// ──────────────────────────────────────────────────────────────────────────────
let gpConnected = false;
let lastSource: Source = "kbd";
let lastKbdAt = 0;
let lastGpAt = 0;

const ACTIVE_MS = 900;       // input-source hysteresis
const AXIS_DEADZONE = 0.28;  // left/right stick deadzone
const TRIGGER_T = 0.5;       // analog trigger fallback threshold

function anyKeyActive(): boolean {
  return Object.values(k).some(Boolean);
}

function deadzone(v: number, dz = AXIS_DEADZONE) {
  return Math.abs(v) < dz ? 0 : v;
}

function buttonPressed(gp: Gamepad, i: number): boolean {
  const b = gp.buttons[i];
  return !!(b && b.pressed);
}

function axis(gp: Gamepad, idx: number, dz = AXIS_DEADZONE) {
  const v = gp.axes[idx] ?? 0;
  return Math.abs(v) < dz ? 0 : v;
}

function readGamepad() {
  const pads = (navigator.getGamepads && navigator.getGamepads()) || [];
  let gp: Gamepad | null = null;

  for (let i = 0; i < pads.length; i++) {
    if (pads[i]) { gp = pads[i] as Gamepad; break; }
  }
  if (!gp) return null;

  // Left stick (movement/jump aim)
  const lx = axis(gp, 0); // LS X
  const ly = axis(gp, 1); // LS Y

  // Right stick (portal aim)
  const rx = axis(gp, 2);
  const ry = axis(gp, 3);

  // D-pad fallbacks
  const dLeft  = buttonPressed(gp, 14);
  const dRight = buttonPressed(gp, 15);
  const dUp    = buttonPressed(gp, 12);
  const dDown  = buttonPressed(gp, 13);

  const left  = lx < -AXIS_DEADZONE || dLeft;
  const right = lx >  AXIS_DEADZONE || dRight;
  const up    = ly < -AXIS_DEADZONE || dUp;
  const down  = ly >  AXIS_DEADZONE || dDown;

  const jump  = buttonPressed(gp, 0);            // A / Cross

  // ✅ Reset: Start/Options/Share OR Triangle/Y (button index 3)
  const startLike = buttonPressed(gp, 9) || buttonPressed(gp, 8);
  const triY      = buttonPressed(gp, 3);        // Y / Triangle
  const reset = startLike || triY;

  // Triggers for portal shooting:
  // Prefer button indices 7=RT, 6=LT; also check axes[5]/axes[4] analog fallback.
  const rtBtn  = buttonPressed(gp, 7);
  const ltBtn  = buttonPressed(gp, 6);
  const rtAxis = (gp.axes[5] ?? gp.axes[4] ?? 0) > TRIGGER_T;
  const ltAxis = (gp.axes[4] ?? gp.axes[5] ?? 0) > TRIGGER_T;
  const shootA = rtBtn || rtAxis; // Blue (M1) on RT
  const shootB = ltBtn || ltAxis; // Orange (M2) on LT

  const any =
    left || right || up || down || jump || reset || shootA || shootB ||
    Math.abs(lx) > 0 || Math.abs(ly) > 0 || Math.abs(rx) > 0 || Math.abs(ry) > 0;

  return {
    // digital-style booleans
    left, right, up, down, jump, reset,

    // portal triggers
    shootA, // RT → Blue / A
    shootB, // LT → Orange / B

    // analog sticks
    lx, ly, // left stick
    rx, ry, // right stick (portal aim)

    any,
  };
}

export function setupInput() {
  addEventListener("keydown", e => {
    k[e.keyCode] = true;
    lastKbdAt = performance.now();
    lastSource = "kbd";
  });
  addEventListener("keyup",   e => { k[e.keyCode] = false; });

  addEventListener("gamepadconnected",   () => { gpConnected = true; });
  addEventListener("gamepaddisconnected",() => {
    const pads = (navigator.getGamepads && navigator.getGamepads()) || [];
    gpConnected = pads.some(Boolean);
  });
}

export function getInputState() {
  const now = performance.now();

  let gp = null;
  if (gpConnected || (navigator.getGamepads && navigator.getGamepads().length)) {
    gp = readGamepad();
    if (gp && gp.any) {
      lastGpAt = now;
      lastSource = "gp";
    }
  }

  if (anyKeyActive()) {
    lastKbdAt = now;
    if (now - lastGpAt > ACTIVE_MS) lastSource = "kbd";
  } else if (gp && gp.any) {
    if (now - lastKbdAt > ACTIVE_MS) lastSource = "gp";
  }

  // Build output
  const useGp = (lastSource === "gp") && gp;
  const base = useGp ? gp! : {
    left:  m.l.some(c => k[c]),
    right: m.r.some(c => k[c]),
    up:    m.u.some(c => k[c]),
    down:  m.d.some(c => k[c]),
    jump:  m.j.some(c => k[c]),
    reset: m.rs.some(c => k[c]),
    shootA:false,
    shootB:false,
    lx: 0, ly: 0,
    rx: 0, ry: 0,
  };

  return {
    left:  !!base.left,
    right: !!base.right,
    up:    !!base.up,
    down:  !!base.down,
    jump:  !!base.jump,
    reset: !!base.reset,

    // analog sticks
    lx: Number(base.lx) || 0,
    ly: Number(base.ly) || 0,
    rx: Number(base.rx) || 0,
    ry: Number(base.ry) || 0,

    // triggers for portals
    shootA: !!(base as any).shootA,
    shootB: !!(base as any).shootB,

    source: useGp ? "gp" as const : "kbd" as const,
    gamepadConnected: gpConnected,
  };
}
