// src/engine/input.ts

const keys: Record<string, boolean> = {};

export type InputState = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
};

/**
 * Initializes input listeners and tracks current key state.
 */
export function setupInput() {
  window.addEventListener("keydown", (e) => {
    keys[e.code] = true;
  });

  window.addEventListener("keyup", (e) => {
    keys[e.code] = false;
  });
}

/**
 * Returns a normalized input snapshot for game logic.
 */
export function getInputState(): InputState {
  return {
    left: keys["ArrowLeft"] || keys["KeyA"] || false,
    right: keys["ArrowRight"] || keys["KeyD"] || false,
    up: keys["ArrowUp"] || keys["KeyW"] || false,
    down: keys["ArrowDown"] || keys["KeyS"] || false,
    jump: keys["Space"] || false
  };
}
