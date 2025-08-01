import { AtlasAnimator } from "../animation/AtlasAnimator";
import {
  getAtlasImage,
  waitForAtlas
} from "../engine/renderer/SharedAtlas";

// TexturePacker "frame" data mapped directly
export const atlasMeta = {
  flip:   { x: 384, y: 48, w: 288, h: 48 },  // player flip spin 48x48-Sheet-Sheet.png
  idle:   { x: 0,   y: 0,  w: 480, h: 48 },  // Player Idle 48x48.png
  land:   { x: 480, y: 0,  w: 432, h: 48 },  // player land 48x48.png
  climb:  { x: 960, y: 48, w: 240, h: 48 },  // player ledge climb 48x48.png
  jump:   { x: 672, y: 48, w: 288, h: 48 },  // player new jump 48x48.png
  roll:   { x: 912, y: 0,  w: 336, h: 48 },  // Player Roll 48x48.png
  run:    { x: 0,   y: 48, w: 384, h: 48 }   // player run 48x48.png
};

// Each frame is 48x48; divide w by 48 to get frameCount
export const animations = [
  { name: "flip",  frameCount: 6,  fps: 6, dx: 0,   dy: 0 },
  { name: "idle",  frameCount: 10, fps: 6, dx: 60,  dy: 0 },
  { name: "land",  frameCount: 9,  fps: 6, dx: 120, dy: 0 },
  { name: "climb", frameCount: 5,  fps: 6, dx: 180, dy: 0 },
  { name: "jump",  frameCount: 6,  fps: 6, dx: 0,   dy: 60 },
  { name: "roll",  frameCount: 7,  fps: 6, dx: 60,  dy: 60 },
  { name: "run",   frameCount: 8,  fps: 6, dx: 120, dy: 60 }
];

export function createAnimator(callback: (animator: AtlasAnimator) => void) {
  waitForAtlas("anim").then(() => {
    const img = getAtlasImage("anim");
    const animator = new AtlasAnimator(img, atlasMeta, 48, 48, animations);
    callback(animator);
  });
}
