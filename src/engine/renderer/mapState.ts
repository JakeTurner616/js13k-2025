// src/engine/renderer/mapState.ts
export type GameMap = { width: number; height: number; tiles: Uint32Array | number[] };

let current: GameMap | null = null;

export const setCurrentMap = (m: GameMap) => { current = m; };
export const getCurrentMap = () => current;
