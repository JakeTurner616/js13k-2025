// src/engine/renderer/level-loader.ts

import { decodeBase64RLEToUint32Array } from "../Inflate";
import {
  LEVEL_1_BASE64,
  LEVEL_1_WIDTH,
  LEVEL_1_HEIGHT
} from "../../levels/level1.ts";

import { setSolidTiles } from "../../player/Physics.ts";
import { setCurrentMap, getCurrentMap } from "./MapContext.ts";
import { tileAtlasMeta } from "../../atlas/tileAtlas"; // ⬅ use packed/used GIDs

/**
 * Loads level 1 from compressed RLE base64 data and sets up the map context.
 * Also marks as "solid" exactly the GIDs present in the packed tile atlas.
 */
export function loadLevel1() {
  const tiles = decodeBase64RLEToUint32Array(LEVEL_1_BASE64);
  const map = {
    width: LEVEL_1_WIDTH,
    height: LEVEL_1_HEIGHT,
    tiles
  };

  setCurrentMap(map);

  // ✅ Mark only the actually-used/packed GIDs as solid
  // (adjust later if you introduce decorative/non-solid tiles)
  const solidTileIds = Object.keys(tileAtlasMeta).map(n => +n);
  setSolidTiles(solidTileIds);
}

export { getCurrentMap };
