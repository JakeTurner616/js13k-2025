// src/player/Player.ts

import type { State } from "./states/types";
import { Idle } from "./states/Idle";
import { Run } from "./states/Run";
import { Jump } from "./states/Jump";
import { applyPhysics } from "./Physics";
import type { PhysicsBody } from "./Physics";
import { AnimationController } from "./AnimationController";

const stateMap: Record<string, State> = {
  idle: Idle,
  run: Run,
  jump: Jump
};

export class Player {
  body: PhysicsBody;
  anim: AnimationController;

  gravity = 0.5;
  moveSpeed = 1.5;
  jumpSpeed = 6;

  private currentState: State = Idle;
  private currentName = "idle";

  constructor() {
    this.body = {
      pos: { x: 48, y: 48 },
      vel: { x: 0, y: 0 },
      width: 48,
      height: 48,
      grounded: false
    };

    this.anim = new AnimationController(this);
  }

  setState(name: string) {
    const next = stateMap[name];
    if (!next || next === this.currentState) return;

    this.currentState.exit?.(this);
    this.currentState = next;
    this.currentName = name;
    this.currentState.enter?.(this);
  }

  update(input: any, ctx: CanvasRenderingContext2D) {
    this.currentState.update(this, input);
    applyPhysics(this.body, ctx);
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "lime";
    ctx.fillRect(
      this.body.pos.x,
      this.body.pos.y,
      this.body.width,
      this.body.height
    );
  }

  // Animation dispatcher (hooked from AnimationController)
  setAnimation(_name: string) {
    // Implement atlas animation switching here later
    // e.g. animator.play("player-run", this.body.pos.x, this.body.pos.y)
  }

  get grounded(): boolean {
    return this.body.grounded;
  }

  set grounded(val: boolean) {
    this.body.grounded = val;
  }

  get vel() {
    return this.body.vel;
  }

  set vel(v) {
    this.body.vel = v;
  }

  get pos() {
    return this.body.pos;
  }

  set pos(p) {
    this.body.pos = p;
  }

  get width() {
    return this.body.width;
  }

  get height() {
    return this.body.height;
  }
}
