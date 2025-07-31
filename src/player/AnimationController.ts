// src/player/AnimationController.ts

import type { Player } from "./Player";

// Define all animation names used in the sprite atlas
type AnimationName = "idle" | "run" | "jump";

export class AnimationController {
  private current: AnimationName = "idle";

  private player: Player;

  constructor(player: Player) {
    this.player = player;
  }

  set(state: AnimationName) {
    if (state === this.current) return;
    this.current = state;
    this.player.setAnimation(state);
  }

  getCurrent(): AnimationName {
    return this.current;
  }
}
