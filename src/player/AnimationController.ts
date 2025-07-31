// AnimationController.ts
import type { Player } from "./Player"; // Adjust the path if needed
export type AnimationName = "idle" | "run" | "jump"; // Only these allowed

const VALID: Set<string> = new Set(["idle", "run", "jump"]);

export class AnimationController {
  private current: AnimationName = "idle";
  private player: Player;

  constructor(player: Player) {
    this.player = player;
  }

  set(state: AnimationName) {
    if (!VALID.has(state)) return; // 💥 invalid input ignored
    if (state === this.current) return;

    this.current = state;
    this.player.setAnimation(state); // optional if loop-safe
  }

  getCurrent(): AnimationName {
    return this.current;
  }
}
