// src/engine/level-loader.ts
import { inflate } from "pako";
import {
  LEVEL_1_BASE64,
  LEVEL_1_WIDTH,
  LEVEL_1_HEIGHT
} from "../levels/level1.ts";

let currentMap: {
  width: number;
  height: number;
  tiles: Uint32Array;
} | null = null;

function decodeBase64ZlibToUint32Array(encoded: string): Uint32Array {
  const binary = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
  const decompressed = inflate(binary);
  const view = new DataView(decompressed.buffer);
  const tileCount = decompressed.byteLength / 4;

  const arr = new Uint32Array(tileCount);
  for (let i = 0; i < tileCount; i++) {
    arr[i] = view.getUint32(i * 4, true); // little-endian
  }
  return arr;
}

export function loadLevel1() {
  currentMap = {
    width: LEVEL_1_WIDTH,
    height: LEVEL_1_HEIGHT,
    tiles: decodeBase64ZlibToUint32Array(LEVEL_1_BASE64)
  };
}

export function getCurrentMap() {
  return currentMap;
}
