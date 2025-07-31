// src/player/Player.ts

import type { State } from "./states/types";
import { Idle } from "./states/Idle";
import { Run } from "./states/Run";
import { Jump } from "./states/Jump";
import { applyPhysics } from "./Physics";
import type { PhysicsBody } from "./Physics";
import { AnimationController, type AnimationName } from "./AnimationController";
import type { AtlasAnimator } from "../animation/AtlasAnimator";

const stateMap: Record<string, State> = {
  idle: Idle,
  run: Run,
  jump: Jump
};

export class Player {
  body: PhysicsBody;
  anim: AnimationController;
  private animator: AtlasAnimator;

  
  moveSpeed = 1.5;
  jumpSpeed = 6;

  private currentState: State = Idle;

  constructor(animator: AtlasAnimator) {
    this.body = {
      pos: { x: 48, y: 48 },
      vel: { x: 0, y: 0 },
      width: 48,
      height: 48,
      grounded: false
    };

    this.animator = animator;
    this.anim = new AnimationController(this);
  }

setState(name: string) {
  const next = stateMap[name];
  if (!next || next === this.currentState) return;

  // Prevent jumping if not grounded
  if (name === "jump" && !this.grounded) return;

  this.currentState.exit?.(this);
  this.currentState = next;
  this.currentState.enter?.(this);
}


  update(input: any, ctx: CanvasRenderingContext2D) {
    this.currentState.update(this, input);
    applyPhysics(this.body, ctx);
  }

draw(ctx: CanvasRenderingContext2D, time: number) {
  const animName = this.anim.getCurrent();

  // Look up metadata for the current animation
  const meta = this.animator.getMeta(animName); // <-- Add this helper method in AtlasAnimator
  const fps = meta?.fps ?? 6;
  const frameCount = meta?.frameCount ?? 1;

  const frameIndex = Math.floor((time / 1000) * fps) % frameCount;

  this.animator.drawFrame(
    ctx,
    animName,
    frameIndex,
    this.body.pos.x,
    this.body.pos.y
  );
}

  setAnimation(name: AnimationName) {
    this.anim.set(name);
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
