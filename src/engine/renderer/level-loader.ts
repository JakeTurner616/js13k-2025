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
 */
export function loadLevel1() {
  const tiles = decodeBase64RLEToUint32Array(LEVEL_1_BASE64);
  const map = {
    width: LEVEL_1_WIDTH,
    height: LEVEL_1_HEIGHT,
    tiles
  };

  setCurrentMap(map);

  // You can fine-tune this list if you later add non-solid tiles
  const solidTileIds = Array.from({ length: 72 }, (_, i) => i + 1);
  setSolidTiles(solidTileIds);
}

export { getCurrentMap };
