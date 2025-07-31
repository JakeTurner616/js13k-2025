// src/player/states/Idle.ts

import type { State, InputState } from "./types";

export const Idle: State = {
  enter(player) {
    player.setAnimation("idle");
    player.vel.x = 0;
  },

  update(player, input: InputState) {
    if (input.jump && player.grounded) {
      player.setState("jump");
    } else if (input.left || input.right) {
      player.setState("run");
    }
  }
};
