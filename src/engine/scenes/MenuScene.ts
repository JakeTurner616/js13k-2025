// src/engine/scenes/MenuScene.ts

import { drawText } from "../font/fontEngine";
import { createShaderLayer } from "../shaders/ShaderLayer";
import { stylishText } from "../../shaders/stylishText.glsl";

let drawMasked: ReturnType<typeof createShaderLayer>;

export const MenuScene = {
  __ctx: null as CanvasRenderingContext2D | null,
  __glCanvas: null as HTMLCanvasElement | null,
  __maskCtx: null as CanvasRenderingContext2D | null,
  __mask: null as HTMLCanvasElement | null,
  onClick: undefined as undefined | (() => void),

  setCanvas(ctx: CanvasRenderingContext2D, glCanvas: HTMLCanvasElement, maskCtx: CanvasRenderingContext2D, mask: HTMLCanvasElement) {
    this.__ctx = ctx;
    this.__glCanvas = glCanvas;
    this.__maskCtx = maskCtx;
    this.__mask = mask;
  },

  start() {
    const gl = this.__glCanvas?.getContext("webgl");
    if (!gl) {
      console.error("WebGL context not available");
      return;
    }

    drawMasked = createShaderLayer(gl, this.__glCanvas!, stylishText);

    const handleClick = () => this.onClick?.();
    addEventListener("click", handleClick, { once: true });
  },

  update(_t: number) {},

  draw(t: number) {
    if (!this.__ctx || !this.__mask || !this.__maskCtx || !drawMasked) return;

    const ctx = this.__ctx;
    const maskCtx = this.__maskCtx;
    const mask = this.__mask;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    maskCtx.clearRect(0, 0, mask.width, mask.height);

    const scale = 4;
    const text = "HELLO WORLD";
    const x = 60;
    const y = 100;

    drawText(maskCtx, text, x, y, scale, "#fff");
    drawMasked.render(t / 1000, mask, [0, 0, ctx.canvas.width, ctx.canvas.height]);
  }
};
