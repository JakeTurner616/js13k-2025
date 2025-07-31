import type { State, InputState } from "./types";

export const Jump: State = {
  enter(player) {
    player.setAnimation("jump");
  },

  update(player, input: InputState) {
    const speed = player.moveSpeed;

    if (input.left) {
      player.vel.x = -speed;
    } else if (input.right) {
      player.vel.x = speed;
    }

    if (player.vel.y >= 0) {
      player.setState("idle");
    }
  }
};
