// src/player/Player.ts

import type { State } from "./states/types";
import { Idle } from "./states/Idle";
import { Run } from "./states/Run";
import { Jump } from "./states/Jump";
import { applyPhysics, type PhysicsBody } from "./Physics";
import { AnimationController, type AnimationName } from "./AnimationController";
import type { AtlasAnimator } from "../animation/AtlasAnimator";

// Avoid magic strings by reusing keys
const STATES: Record<string, State> = { idle: Idle, run: Run, jump: Jump };

export class Player {
  body: PhysicsBody = {
    pos: { x: 48, y: 48 },
    vel: { x: 0, y: 0 },
    width: 48,
    height: 48,
    grounded: false
  };

  anim: AnimationController;
  private current: State = Idle;

  moveSpeed = 1.5;
  jumpSpeed = 6;

  atlas: AtlasAnimator;

  constructor(atlas: AtlasAnimator) {
    this.atlas = atlas;
    this.anim = new AnimationController(this);
  }

  setState(next: keyof typeof STATES) {
    const s = STATES[next];
    if (!s || s === this.current || (next === "jump" && !this.grounded)) return;
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

  draw(ctx: CanvasRenderingContext2D, t: number) {
    const name = this.anim.getCurrent();
    const m = this.atlas.getMeta(name);
    const i = Math.floor((t / 1000) * (m?.fps ?? 6)) % (m?.frameCount ?? 1);
    this.atlas.drawFrame(ctx, name, i, this.body.pos.x, this.body.pos.y);
  }

  // Getter/setter proxies for body
  get pos() { return this.body.pos; }
  set pos(p) { this.body.pos = p; }

  get vel() { return this.body.vel; }
  set vel(v) { this.body.vel = v; }

  get grounded() { return this.body.grounded; }
  set grounded(v) { this.body.grounded = v; }

  get width() { return this.body.width; }
  get height() { return this.body.height; }
}
