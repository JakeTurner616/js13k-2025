// src/engine/renderer/level-loader.ts

import { decodeBase64RLEToUint32Array } from "../Inflate";
import {
  LEVEL_1_BASE64,
  LEVEL_1_WIDTH,
  LEVEL_1_HEIGHT
} from "../../levels/level1.ts";

import { setSolidTiles } from "../../player/Physics.ts";
import { setCurrentMap, getCurrentMap } from "./MapContext.ts";

/**
 * Loads level 1 from compressed RLE base64 data and sets up the map context.
 * Marks as "solid" every non-zero GID present in the map layer.
 */
export function loadLevel1() {
  const tiles = decodeBase64RLEToUint32Array(LEVEL_1_BASE64);
  const map = { width: LEVEL_1_WIDTH, height: LEVEL_1_HEIGHT, tiles };

  setCurrentMap(map);

  // ✅ Any nonzero GID becomes solid (tiny & future-proof)
  const solid = new Set<number>();
  for (let i = 0; i < tiles.length; i++) {
    const id = tiles[i] as number;
    if (id) solid.add(id);
  }
  setSolidTiles([...solid]);
}

export { getCurrentMap };
