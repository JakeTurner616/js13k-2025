import type { State, InputState } from "./types";

export const Run: State = {
  enter(player) {
    player.setAnimation("run");
  },

  update(player, input: InputState) {
    const speed = player.moveSpeed;

    if (input.left) {
      player.vel.x = -speed;
    } else if (input.right) {
      player.vel.x = speed;
    } else {
      player.vel.x = 0;
      player.setState("idle");
    }

    if (input.jump) {
      player.vel.y = -player.jumpSpeed;
      player.setState("jump");
    }
  }
};
