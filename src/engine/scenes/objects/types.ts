// src/engine/scenes/objects/building/types.ts

export type BuildingVariant = {
  h: number;
  colsLeft: number;
  colsRight?: number;
  hat?: boolean;
  columns?: boolean;
  sills?: boolean;
  rows: number;
  hasAntenna?: boolean;
  antennaHeight?: number;
  antennaRungs?: number;
  wallLeftColor?: string;
  wallRightColor?: string;
  windowLights?: string[][]; // [row][column], shared for both walls
};
