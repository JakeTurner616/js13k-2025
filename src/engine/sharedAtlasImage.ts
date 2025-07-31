// src/engine/sharedAtlasImage.ts

const atlasImage = new Image();
atlasImage.src = "/packed-min.png";

let isReady = false;
const ready: Promise<void> = new Promise((resolve) => {
  atlasImage.onload = () => {
    isReady = true;
    resolve();
  };
});

export function getAtlasImage(): HTMLImageElement {
  return atlasImage;
}

export function waitForAtlas(): Promise<void> {
  return ready;
}

export function isAtlasReady(): boolean {
  return isReady;
}
