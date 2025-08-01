// src/engine/sharedAnimationAtlasImage.ts

const animationAtlas = new Image();
animationAtlas.src = "/packed.png";

let ready = false;
const loaded: Promise<void> = new Promise((resolve) => {
  animationAtlas.onload = () => {
    ready = true;
    resolve();
  };
});

export function getAnimationAtlasImage(): HTMLImageElement {
  return animationAtlas;
}
export function waitForAnimationAtlas(): Promise<void> {
  return loaded;
}
export function isAnimationAtlasReady(): boolean {
  return ready;
}
