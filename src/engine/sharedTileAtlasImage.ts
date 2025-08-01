// src/engine/sharedTileAtlasImage.ts

const tileAtlas = new Image();
tileAtlas.src = "/map.png";

let ready = false;
const loaded: Promise<void> = new Promise((resolve) => {
  tileAtlas.onload = () => {
    ready = true;
    resolve();
  };
});

export function getTileAtlasImage(): HTMLImageElement {
  return tileAtlas;
}
export function waitForTileAtlas(): Promise<void> {
  return loaded;
}
export function isTileAtlasReady(): boolean {
  return ready;
}
