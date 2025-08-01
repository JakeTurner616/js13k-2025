// src/engine/MapContext.ts

export type GameMap = {
  width: number;
  height: number;
  tiles: Uint32Array;
};

let currentMap: GameMap | null = null;

export function setCurrentMap(map: GameMap) {
  currentMap = map;
}

export function getCurrentMap(): GameMap | null {
  return currentMap;
}
