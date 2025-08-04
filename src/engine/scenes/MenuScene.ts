import { drawText } from "../font/fontEngine";
import { createShaderLayer } from "../shaders/ShaderLayer";
import { stylishText1 } from "../../shaders/effect1.glsl";
import { stylishText2 } from "../../shaders/effect2.glsl";
import { stylishText3 } from "../../shaders/effect3.glsl";
import {
  applyPhysics,
  setSolidTiles,
  type PhysicsBody
} from "../../player/Physics";

const TILE_SIZE = 32;
const TILE_COLS = 30;
const bounceText = "HELLO WORLD";
const titleText = "HELLO WORLD";
const SHADERS = [stylishText1, stylishText2, stylishText3];

const bouncingChars: (PhysicsBody & { ch: string })[] = [];
const floatingChars: { ch: string; baseX: number; baseY: number; offset: number }[] = [];

let bounceLayer: ReturnType<typeof createShaderLayer>;
let floatLayer: ReturnType<typeof createShaderLayer>;
let shadowLayer: ReturnType<typeof createShaderLayer>;

export const MenuScene = {
  __ctx: null as CanvasRenderingContext2D | null,
  __glCanvas: null as HTMLCanvasElement | null,
  __maskCtx: null as CanvasRenderingContext2D | null,
  __mask: null as HTMLCanvasElement | null,
  onClick: undefined as undefined | (() => void),
  shaderIndex: 0,

  __fakeMap: {
    width: TILE_COLS,
    height: 0,
    tiles: [] as number[]
  },

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

  start() {
    const gl = this.__glCanvas?.getContext("webgl");
    if (!gl) return console.error("WebGL context not available");

    bounceLayer = createShaderLayer(gl, this.__glCanvas!, SHADERS[0]);
    floatLayer = createShaderLayer(gl, this.__glCanvas!, SHADERS[1]);
    shadowLayer = createShaderLayer(gl, this.__glCanvas!, SHADERS[2]);

    const canvasHeight = this.__ctx!.canvas.height;
    const rows = Math.ceil(canvasHeight / TILE_SIZE);
    this.__fakeMap.width = TILE_COLS;
    this.__fakeMap.height = rows;
    this.__fakeMap.tiles = [
      ...Array(TILE_COLS * (rows - 1)).fill(0),
      ...Array(TILE_COLS).fill(1)
    ];
    setSolidTiles([1]);

    // Bouncing chars
    const scale = 4;
    let x = 40;
    for (let i = 0; i < bounceText.length; i++) {
      bouncingChars.push({
        pos: { x, y: 60 },
        vel: { x: (Math.random() - 0.5) * 2, y: -Math.random() * 2 },
        width: 8 * scale,
        height: 8 * scale,
        grounded: false,
        gravity: 0.14,
        bounce: 0.6,
        ch: bounceText[i]
      });
      x += 8 * scale;
    }

    // Floating title chars
    const startX = 80;
    const baseY = 30;
    for (let i = 0; i < titleText.length; i++) {
      floatingChars.push({
        ch: titleText[i],
        baseX: startX + i * 32,
        baseY,
        offset: Math.random() * Math.PI * 2
      });
    }

    addEventListener("click", () => {
      this.shaderIndex = (this.shaderIndex + 1) % SHADERS.length;
      bounceLayer = createShaderLayer(gl, this.__glCanvas!, SHADERS[this.shaderIndex]);
      floatLayer = createShaderLayer(gl, this.__glCanvas!, SHADERS[(this.shaderIndex + 1) % SHADERS.length]);
      shadowLayer = createShaderLayer(gl, this.__glCanvas!, SHADERS[(this.shaderIndex + 2) % SHADERS.length]);
      this.onClick?.();
    });
  },

  update(t: number) {
    if (!this.__ctx) return;

    for (let c of bouncingChars) {
      applyPhysics(c, this.__ctx, this.__fakeMap, true);
      c.vel.x *= 0.98;
      if (Math.abs(c.vel.x) < 0.01) c.vel.x = 0;
    }
  },

  draw(t: number) {
    if (!this.__ctx || !this.__mask || !this.__maskCtx) return;
    const ctx = this.__ctx;
    const maskCtx = this.__maskCtx;
    const mask = this.__mask;
    const time = t / 1000;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    maskCtx.clearRect(0, 0, mask.width, mask.height);

    // Draw bouncing chars
    for (let c of bouncingChars) {
      drawText(maskCtx, c.ch, c.pos.x | 0, c.pos.y | 0, 4, "#fff");
    }
    bounceLayer.render(time, mask, [0, 0, ctx.canvas.width, ctx.canvas.height]);

    // --- SHADOW MASK PASS ---
    maskCtx.clearRect(0, 0, mask.width, mask.height);
    for (let f of floatingChars) {
      const floatY = f.baseY + Math.sin(time * 2 + f.offset) * 3;
      drawText(maskCtx, f.ch, f.baseX + 1, floatY + 1, 4, "#fff");
    }
    shadowLayer.render(time, mask, [0, 0, ctx.canvas.width, ctx.canvas.height]);

    // --- FOREGROUND MASK PASS ---
    maskCtx.clearRect(0, 0, mask.width, mask.height);
    for (let f of floatingChars) {
      const floatY = f.baseY + Math.sin(time * 2 + f.offset) * 3;
      drawText(maskCtx, f.ch, f.baseX, floatY, 4, "#fff");
    }
    floatLayer.render(time, mask, [0, 0, ctx.canvas.width, ctx.canvas.height]);
  }
};
