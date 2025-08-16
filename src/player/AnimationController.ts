// src/player/AnimationController.ts

// Allow only animation clip names that actually exist in the atlas
export type AnimationName =
  | "idle"
  | "dash"
  | "jump"
  | "fall"
  | "ledge"
  | "death";

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
