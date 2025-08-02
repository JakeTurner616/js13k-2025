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
    width: 48,
    height: 48,
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

  draw(ctx: CanvasRenderingContext2D, t: number) {
    const a = this.anim.getCurrent();
    const m = this.atlas.getMeta(a);
    const i = Math.floor((t / 1000) * (m?.fps ?? 6)) % (m?.frameCount ?? 1);
    this.atlas.drawFrame(ctx, a, i, this.body.pos.x, this.body.pos.y);
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
