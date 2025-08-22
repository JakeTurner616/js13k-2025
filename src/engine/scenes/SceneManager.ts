// src/engine/scenes/SceneManager.ts
import { tickFPS, drawFPS } from "../debug/FPS";

export type Scene = {
  start?(): void;
  stop?(): void;
  update(): void;
  // pass both now and alpha (0..1 interpolation between sim steps)
  draw(now: number, alpha: number): void;
};

let cur: Scene | null = null;
export function setScene(s: Scene) { cur?.stop?.(); cur = s; cur.start?.(); }

// ---------- fixed-step sim (gameplay tuning stays the same) ----------
let DT = 1/50, acc = 0, last = 0, MAX = 10;  // ← back to 50 Hz sim
export function setSimHz(hz: number) { DT = 1 / Math.max(1, hz); }

// ---------- draw-rate cap (e.g., force 60) ----------
let DHZ = 0, DDT = 0, lastDraw = 0;
export function setDrawHz(hz:number){ DHZ = Math.max(0, hz|0); DDT = DHZ ? 1000 / DHZ : 0; }

export function loop(t:number){
  if(!cur){ requestAnimationFrame(loop); return; }
  if(!last) last = t;

  let d = (t - last) / 1000;
  if (d > 0.25) d = 0.25; // clamp huge pauses
  last = t; acc += d;

  // run fixed-step updates; gameplay speed is tied to DT, not draw Hz
  let n = 0; 
  while (acc >= DT && n++ < MAX) { 
    cur.update(); 
    acc -= DT; 
  }

  // alpha = how far we are into the next step (for render interpolation)
  const alpha = acc / DT;

  if (!DHZ || t - lastDraw >= DDT) {
    lastDraw = t;
    cur.draw(t, alpha);
    tickFPS(t);
    drawFPS();
  }
  requestAnimationFrame(loop);
}
