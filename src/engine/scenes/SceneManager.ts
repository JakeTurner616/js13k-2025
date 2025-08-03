// src/engine/scenes/SceneManager.ts

export interface Scene {
  start(): void;
  update(t: number): void;
  draw(t: number): void;
}

let current: Scene | null = null;

export function setScene(s: Scene) {
  current = s;
  s.start();
}

export function loop(t: number) {
  current?.update(t);
  current?.draw(t);
  requestAnimationFrame(loop);
}
