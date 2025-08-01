import { setupCanvasPair } from "./engine/renderer/initCanvas";
import { createAnimator } from "./atlas/animationAtlas";
import { loadLevel1, getCurrentMap } from "./engine/renderer/level-loader";
import { setupInput, getInputState } from "./engine/input/input";
import { drawMapAndColliders } from "./engine/renderer/render";
import { createShaderLayer } from "./engine/shaders/ShaderLayer";
import { Player } from "./player/Player";
import { demoFrag } from "./shaders/demoPulse.glsl";

// --- Config ---
const WORLD = { w: 480, h: 270 };
const TILE_SIZE = 32;

// --- Init ---
const { ctx, glCanvas, mask, maskCtx } = setupCanvasPair(WORLD.w, WORLD.h);
setupInput();

let drawMasked: (t: number, m: HTMLCanvasElement, r: [number, number, number, number]) => void;
let player: Player;
let animator: any;

// --- Asset load + boot ---
createAnimator((a) => {
  animator = a;
  player = new Player(animator);
  loadLevel1();
  drawMasked = createShaderLayer(glCanvas.getContext("webgl")!, glCanvas, demoFrag);
  requestAnimationFrame(loop);
});

// --- Game loop ---
function loop(t: number) {
  const map = getCurrentMap();
  if (!map) return requestAnimationFrame(loop);

  ctx.clearRect(0, 0, WORLD.w, WORLD.h);
  drawMapAndColliders(ctx, map, TILE_SIZE);

  // Player mask render
  maskCtx.clearRect(0, 0, 48, 48);
  const anim = player.anim.getCurrent();
  const meta = animator.getMeta(anim);
  const frame = Math.floor((t / 1000) * (meta?.fps ?? 6)) % (meta?.frameCount ?? 1);
  animator.drawFrame(maskCtx, anim, frame, 0, 0);

  player.update(getInputState(), ctx);
  player.draw(ctx, t);

  drawMasked(t / 1000, mask, [player.pos.x | 0, player.pos.y | 0, 48, 48]);
  requestAnimationFrame(loop);
}
