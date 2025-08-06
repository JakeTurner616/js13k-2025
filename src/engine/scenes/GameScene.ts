// src/engine/scenes/GameScene.ts

import { getInputState } from "../input/input";
import { drawMapAndColliders } from "../renderer/render";
import { loadLevel1, getCurrentMap } from "../renderer/level-loader";
import { createShaderLayer } from "../shaders/ShaderLayer";
import { drawText } from "../font/fontEngine";
import { Player } from "../../player/Player";
import { demoFrag } from "../../shaders/demoPulse.glsl";
import { redPulse } from "../../shaders/redPulse.glsl";

import type { AtlasAnimator } from "../../animation/AtlasAnimator";

let drawMasked: ReturnType<typeof createShaderLayer>;
let drawGlow: ReturnType<typeof createShaderLayer>;

let glowMask: HTMLCanvasElement;
let glowCtx: CanvasRenderingContext2D;

let player: Player;
let animator: AtlasAnimator;
let lastJump = false;

export const GameScene = {
  __ctx: null as CanvasRenderingContext2D | null,
  __glCanvas: null as HTMLCanvasElement | null,
  __maskCtx: null as CanvasRenderingContext2D | null,
  __mask: null as HTMLCanvasElement | null,

  setCanvas(
    ctx: CanvasRenderingContext2D,
    glCanvas: HTMLCanvasElement,
    maskCtx: CanvasRenderingContext2D,
    mask: HTMLCanvasElement
  ) {
    this.__ctx = ctx;
    this.__glCanvas = glCanvas;
    this.__maskCtx = maskCtx;
    this.__mask = mask;
  },

  injectAnimator(a: AtlasAnimator) {
    animator = a;
    player = new Player(animator);
  },

  start() {
    const gl = this.__glCanvas?.getContext("webgl");
    if (!gl) {
      console.error("WebGL context not available");
      return;
    }

    if (this.__mask) {
      this.__mask.width = 48;
      this.__mask.height = 48;
    }

    glowMask = document.createElement("canvas");
    glowMask.width = 480;
    glowMask.height = 270;
    glowCtx = glowMask.getContext("2d")!;

    drawMasked = createShaderLayer(gl, this.__glCanvas!, demoFrag);
    drawGlow = createShaderLayer(gl, this.__glCanvas!, redPulse);


    loadLevel1();
  },

  update(t: number) {
    if (!this.__ctx || !this.__mask || !this.__maskCtx || !player || !animator || !drawMasked) return;

    const input = getInputState();
    const nowJump = input.jump;
    if (nowJump && !lastJump) {
      // Jump trigger
    }
    lastJump = nowJump;
    player.update(input, this.__ctx);
  },

  draw(t: number) {
    const map = getCurrentMap();
    if (!map || !this.__ctx || !this.__mask || !this.__maskCtx || !player || !animator || !drawMasked || !drawGlow) return;

    const ctx = this.__ctx;
    const mask = this.__mask;
    const maskCtx = this.__maskCtx;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    maskCtx.clearRect(0, 0, mask.width, mask.height);
    drawMapAndColliders(ctx, map, 32);

    const anim = player.anim.getCurrent();
    const meta = animator.getMeta(anim);
    if (!meta) return;

    const frame = Math.floor((t / 1000) * meta.fps) % meta.frameCount;
    animator.drawFrame(maskCtx, anim, frame, 0, 0);
    player.draw(ctx, t, frame);

    drawMasked.render(t / 1000, mask, [player.pos.x | 0, player.pos.y | 0, 48, 48]);

    glowCtx.clearRect(0, 0, glowMask.width, glowMask.height);
    drawText(glowCtx, "HELLO WORLD", 16, 16, 3, "#fff");
    drawGlow.render(t / 1000, glowMask, [0, 0, 480, 270]);
  }
};
