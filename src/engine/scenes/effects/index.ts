// src/engine/scenes/effects/index.ts
// Merged effects: Stars, Moon, Clouds, NeonHaze (with safe radius clamps)

const S = Math.sin, C = Math.cos;
const H = (n: number) => { const f = S(n * 12.9898) * 43758.5453; return f - (f | 0); };
const POS = (v: number, eps = 1e-3) => v > eps ? v : eps; // prevent negative/zero radii

// ---------------- Stars ----------------
export function drawStars(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, scroll: number) {
  ctx.fillStyle = "#fff";
  const cutoff = h * .35;
  for (let i = 0; i < 60; i++) {
    const x = (i * 89 + scroll) % w;
    const yf = ((i * 97) % 100 / 100) ** 2;
    const y = cutoff * yf;
    const tw = .5 + .5 * S(t / 500 + i * 7);
    const sz = 1 + tw * .5 * (.3 + ((i * 73) % 10) / 10);
    ctx.globalAlpha = tw;
    ctx.fillRect(x, y, sz, sz);
  }
  ctx.globalAlpha = 1;
}

// ---------------- Moon (clamped) ----------------
export function drawMoon(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, camX: number) {
  const mx = w * .18 + S(t * .05) * 10 - camX * .03;
  const my = h * .22 + S(t * .07) * 6;
  const r  = POS(h * .12);

  // halo
  let g = ctx.createRadialGradient(mx, my, 0, mx, my, POS(r * 2.2));
  g.addColorStop(0, "rgba(210,225,255,.14)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  const hr = r * 2.2; ctx.fillRect(mx - hr, my - hr, hr * 2, hr * 2);

  // disc
  g = ctx.createRadialGradient(mx - r * .25, my - r * .25, POS(r * .2), mx, my, r);
  g.addColorStop(0, "#eef1fb"); g.addColorStop(.7, "#d9dcec"); g.addColorStop(1, "#b7bed2");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(mx, my, r, 0, 7); ctx.fill();

  // craters (clamped radii)
  for (let i = 0; i < 18; i++) {
    const a = H(i) * 6.283, d = r * (.18 + .68 * H(i + 1));
    const cx = mx + C(a) * d, cy = my + S(a) * d;
    if ((cx - mx) ** 2 + (cy - my) ** 2 > r * r * .83) continue;
    const cr = POS(r * (.02 + .05 * H(i + 2)));
    const k  = .35 + .65 * H(i + 3);
    ctx.fillStyle = "rgba(40,45,60,.26)"; ctx.beginPath(); ctx.arc(cx, cy, cr, 0, 7); ctx.fill();
    ctx.strokeStyle = "rgba(230,235,255,.10)"; ctx.lineWidth = POS(cr * .34);
    ctx.beginPath(); ctx.arc(cx, cy, POS(cr * k), 0, 7); ctx.stroke();
  }

  // limb darkening
  const ld = ctx.createRadialGradient(mx, my, 0, mx, my, r);
  ld.addColorStop(0, "rgba(0,0,0,0)"); ld.addColorStop(1, "rgba(0,0,0,.22)");
  ctx.fillStyle = ld; ctx.beginPath(); ctx.arc(mx, my, r + .2, 0, 7); ctx.fill();
}

// ---------------- Clouds ----------------
export function drawClouds(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, scroll: number) {
  const N = (x: number, y: number, s: number) => {
    let a = 0, b = 1, fx = x, fy = y;
    for (let o = 0; o < 3; o++) {
      a += b * (S(fx * .035 + s) + S(fy * .027 + s * 1.7) + S((fx + fy) * .019 + s * 2.3)) / 3;
      b *= .5; fx *= 1.9; fy *= 1.9;
    }
    return a * .5 + .5;
  };
  const R = (x: number, s: number) => (S(x * .02 + s) * .6 + S(x * .037 + s * 1.7) * .3 + S(x * .061 + s * 2.3) * .15) * .5 + .5;

  const GS = 3, PAL = ["#ffffff", "#d6e8f5", "#a7c7de", "#7da8c5"];

  function layer(seed: number, par: number, base: number, amp: number, thick: number, alph: number) {
    const off = scroll * par, y0 = h * base, s = seed + t * .06, L = 64 / par;
    for (let x = -L; x < w + L; x += GS) {
      const u = (x + off) / L, ci = (u | 0), fx = u - ci;
      const r1 = H(ci + seed * 17), r2 = H(ci * 31 + seed * 7);
      if (r1 < .35) continue;
      const width = .35 + .55 * r2, edge = 1 - Math.abs(fx - .5) / (.5 * width);
      if (edge <= 0) continue;
      const edgeSoft = edge > 1 ? 1 : edge < 0 ? 0 : edge;

      const crest = y0 + (R((x + off) * .9, s) - .5) * amp;
      const T = thick * (.7 + .5 * N(ci * .2, crest * .15, s));

      for (let y = Math.max(0, (crest - T) | 0); y < crest + T; y += GS) {
        const v = y - crest, body = Math.max(0, 1 - Math.abs(v) / T);
        const wob = N(x * .6 + ci * 3, y * .5, s) * 50;
        const cover = N(x + wob, v * 1.25 + N(ci, crest, s) * 22, s);
        const dens = cover * body * edgeSoft - .15 + N(x * .7, y * .5, s * .7) * .05;
        if (dens > 0) {
          const shade = dens + (crest - y) * .002 - N(x + 140, y - 30, s) * .05;
          const idx = shade > .32 ? 0 : shade > .22 ? 1 : shade > .12 ? 2 : 3;
          ctx.globalAlpha = alph; ctx.fillStyle = PAL[idx];
          ctx.fillRect(x, y, GS, GS);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  layer(5, .25, .18, 16, 22, .22);
  layer(9, .55, .26, 14, 20, .24);
  layer(13, .95, .34, 12, 18, .26);
}

// ---------------- NeonHaze ----------------
export function drawNeonHaze(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, cx: number) {
  const COL = ["255,80,180", "160,60,255"];
  for (let i = 0; i < 6; i++) {
    const bx = ((i * 300 + cx * .5) % (w + 200)) - 100;
    const by = h * .55 + S(t * .3 + i) * 20;
    const R = 150 + S(t * .7 + i) * 40;
    const a = .4 + .3 * S(t * .5 + i * 2);
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, POS(R));
    g.addColorStop(0, `rgba(${COL[i & 1]},${a})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(bx - R, by - R, R * 2, R * 2);
  }
}
