// src/engine/level-loader.ts

import { inflate } from "pako";
import {
  LEVEL_1_BASE64,
  LEVEL_1_WIDTH,
  LEVEL_1_HEIGHT
} from "../levels/level1.ts";

import { setSolidTiles } from "../player/Physics";
import { setCurrentMap } from "./MapContext.ts";

function decodeBase64ZlibToUint32Array(encoded: string): Uint32Array {
  const binary = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
  const decompressed = inflate(binary);
  const view = new DataView(decompressed.buffer);
  const tileCount = decompressed.byteLength / 4;

  const arr = new Uint32Array(tileCount);
  for (let i = 0; i < tileCount; i++) {
    arr[i] = view.getUint32(i * 4, true);
  }
  return arr;
}

export function loadLevel1() {
  const tiles = decodeBase64ZlibToUint32Array(LEVEL_1_BASE64);
  const map = {
    width: LEVEL_1_WIDTH,
    height: LEVEL_1_HEIGHT,
    tiles
  };

  setCurrentMap(map);

  const solidTileIds = Array.from({ length: 72 }, (_, i) => i + 1);
  setSolidTiles(solidTileIds);
}
