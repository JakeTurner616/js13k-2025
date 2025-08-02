// src/player/AnimationController.ts

export type AnimationName = "idle" | "run" | "jump";

export class AnimationController {
  private current: AnimationName = "idle";

  constructor() {}

  set(n: AnimationName) {
    if (n !== this.current) this.current = n;
  }

  getCurrent(): AnimationName {
    return this.current;
  }
}
