// src/player/states/Jump.ts

import type { State, InputState } from "./types";

export const Jump: State = {
  enter(player) {
    player.setAnimation("jump");
    player.grounded = false;
    player.vel.y = -player.jumpSpeed;
  },

  update(player, input: InputState) {
    const speed = player.moveSpeed;

    if (input.left) {
      player.vel.x = -speed;
    } else if (input.right) {
      player.vel.x = speed;
    }

    // If landed, go back to idle or run
    if (player.grounded) {
      player.setState(input.left || input.right ? "run" : "idle");
    }
  }
};
