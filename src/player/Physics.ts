// src/player/Physics.ts

import { getCurrentMap } from "../engine/level-loader";

export type Vec2 = { x: number; y: number };

export interface PhysicsBody {
  pos: Vec2;
  vel: Vec2;
  acc?: Vec2;
  width: number;
  height: number;
  grounded: boolean;
}

const GRAVITY = 0.5;
const TILE_SIZE = 32;

// Solid tile tracking
const collidableTiles = new Set<number>();

export function setSolidTiles(solidIds: number[]) {
  collidableTiles.clear();
  for (const id of solidIds) {
    collidableTiles.add(id);
  }
}

export function applyPhysics(body: PhysicsBody, ctx: CanvasRenderingContext2D) {
  const map = getCurrentMap();
  if (!map) return;

  body.vel.y += GRAVITY;

  if (body.acc) {
    body.vel.x += body.acc.x;
    body.vel.y += body.acc.y;
  }

  // X movement
  body.pos.x += body.vel.x;
  if (checkCollision(body, ctx)) {
    body.pos.x -= body.vel.x;
    body.vel.x = 0;
  }

  // Y movement
  body.pos.y += body.vel.y;
  if (checkCollision(body, ctx)) {
    // Only set grounded if falling
    if (body.vel.y > 0) {
      body.grounded = true;
    } else {
      body.grounded = false;
    }
    body.pos.y -= body.vel.y;
    body.vel.y = 0;
  } else {
    body.grounded = false;
  }
}

function checkCollision(body: PhysicsBody, ctx: CanvasRenderingContext2D): boolean {
  const map = getCurrentMap();
  if (!map) return false;

  const yOffset = ctx.canvas.height - map.height * TILE_SIZE;

  const minX = Math.floor(body.pos.x / TILE_SIZE);
  const maxX = Math.floor((body.pos.x + body.width - 1) / TILE_SIZE);
  const minY = Math.floor((body.pos.y - yOffset) / TILE_SIZE);
  const maxY = Math.floor((body.pos.y + body.height - 1 - yOffset) / TILE_SIZE);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;

      const index = y * map.width + x;
      const tile = map.tiles[index];
      if (collidableTiles.has(tile)) {
        return true;
      }
    }
  }

  return false;
}

// Debug visual: call in main.ts after map render
export function drawTileColliders(ctx: CanvasRenderingContext2D) {
  const map = getCurrentMap();
  if (!map) return;

  ctx.strokeStyle = "red";
  ctx.lineWidth = 1;

  for (let row = 0; row < map.height; row++) {
    for (let col = 0; col < map.width; col++) {
      const index = row * map.width + col;
      const tile = map.tiles[index];
      if (!collidableTiles.has(tile)) continue;

      const x = col * TILE_SIZE;
      const y = ctx.canvas.height - map.height * TILE_SIZE + row * TILE_SIZE;

      ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
    }
  }
}
