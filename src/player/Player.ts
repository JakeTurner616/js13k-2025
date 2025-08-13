// src/player/Player.ts
import { Idle } from "./states/Idle";
import { Run } from "./states/Run";
import { Jump } from "./states/Jump";
import { applyPhysics, type PhysicsBody } from "./Physics";
import { AnimationController, type AnimationName } from "./AnimationController";
import type { AtlasAnimator } from "../animation/AtlasAnimator";

const STATES = { idle: Idle, run: Run, jump: Jump };

export class Player {
  body: PhysicsBody = {
    pos: { x: 48, y: 48 },
    vel: { x: 0, y: 0 },

    // Visual sprite (32×32 animation frames)
    width: 32,
    height: 32,

    // ⬇️ Collision hitbox (margins that remove empty space):
    // tweak as needed; this example leaves 8px left/right, 6px top,
    // and keeps feet a bit lower for nice ground contact.
    hit: { x: 8, y: 6, w: 16, h: 24 },

    grounded: false
  };

  anim = new AnimationController();
  private current = Idle;
  moveSpeed = 1.5;
  jumpSpeed = 6;
  atlas: AtlasAnimator;

  constructor(atlas: AtlasAnimator) {
    this.atlas = atlas;
  }

  setState(n: keyof typeof STATES) {
    const s = STATES[n];
    if (!s || s === this.current || (n === "jump" && !this.grounded)) return;
    this.current.exit?.(this);
    this.current = s;
    s.enter?.(this);
  }

  setAnimation(name: AnimationName) {
    this.anim.set(name);
  }

  update(input: any, ctx: CanvasRenderingContext2D) {
    this.current.update(this, input);
    applyPhysics(this.body, ctx);
  }

  draw(ctx: CanvasRenderingContext2D, t: number, frameOverride?: number) {
    const a = this.anim.getCurrent();
    const m = this.atlas.getMeta(a);
    const i = frameOverride ?? Math.floor((t / 1000) * (m?.fps ?? 6)) % (m?.frameCount ?? 1);
    this.atlas.drawFrame(ctx, a, i, this.body.pos.x, this.body.pos.y);

    // // DEBUG: visualize hitbox margins (uncomment to see)
    // const hb = this.body.hit!;
    // ctx.strokeStyle = "rgba(255,0,0,0.7)";
    // ctx.strokeRect(this.body.pos.x + hb.x, this.body.pos.y + hb.y, hb.w, hb.h);
  }

  get pos() { return this.body.pos; }
  set pos(p) { this.body.pos = p; }
  get vel() { return this.body.vel; }
  set vel(v) { this.body.vel = v; }
  get grounded() { return this.body.grounded; }
  set grounded(v) { this.body.grounded = v; }
  get width() { return this.body.width; }
  get height() { return this.body.height; }
}
