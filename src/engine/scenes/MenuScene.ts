import { drawText } from "../font/fontEngine";
import { createShaderLayer } from "../shaders/ShaderLayer";
import { stylishText1 } from "../../shaders/effect1.glsl";
import { stylishText2 } from "../../shaders/effect2.glsl";
import {
  applyPhysics,
  setSolidTiles,
  type PhysicsBody
} from "../../player/Physics";

const TILE_SIZE = 32;
const TILE_COLS = 30;
const bounceText = "HELLO WORLD";
const titleText = "HELLO WORLD";
const SHADERS = [stylishText1, stylishText2];

const bouncingChars: (PhysicsBody & { ch: string; delay: number })[] = [];
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
    if (!gl) return;

    this.initShaderLayers(gl);

    const h = this.__ctx!.canvas.height;
    const rows = Math.ceil(h / TILE_SIZE);
    this.__fakeMap = {
      width: TILE_COLS,
      height: rows,
      tiles: [...Array(TILE_COLS * (rows - 1)).fill(0), ...Array(TILE_COLS).fill(1)]
    };
    setSolidTiles([1]);

    // Bouncing text (right to left stagger)
    const scale = 4;
    for (let i = 0, n = bounceText.length; i < n; i++) {
      bouncingChars.push({
        pos: { x: 40 + i * 8 * scale, y: -999 },
        vel: { x: 0, y: 0 },
        width: 8 * scale,
        height: 8 * scale,
        grounded: false,
        gravity: 0.2,
        bounce: 0.5,
        ch: bounceText[i],
        delay: n - i - 1
      });
    }

    // Floating title
    for (let i = 0; i < titleText.length; i++) {
      floatingChars.push({
        ch: titleText[i],
        baseX: 80 + i * 32,
        baseY: 30,
        offset: i
      });
    }

    addEventListener("click", () => {
      this.shaderIndex = (this.shaderIndex + 1) % SHADERS.length;
      this.initShaderLayers(gl);
      this.onClick?.();
    });
  },

  initShaderLayers(gl: WebGLRenderingContext) {
    const a = this.shaderIndex;
    bounceLayer = createShaderLayer(gl, this.__glCanvas!, SHADERS[a]);
    floatLayer = createShaderLayer(gl, this.__glCanvas!, SHADERS[(a + 1) % SHADERS.length]);
    shadowLayer = createShaderLayer(gl, this.__glCanvas!, SHADERS[(a + 2) % SHADERS.length]);
  },

  update(t: number) {
    if (!this.__ctx) return;
    const tick = ((t / 1000) * 10) | 0;

    for (let c of bouncingChars) {
      if (tick >= c.delay && c.pos.y === -999) {
        c.pos.y = 0;
        c.vel.y = 0.1;
      }
      if (c.pos.y !== -999) {
        applyPhysics(c, this.__ctx, this.__fakeMap, true);
        c.vel.x = 0;
      }
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

    // Bounce pass
    for (let c of bouncingChars) {
      if (c.pos.y !== -999) drawText(maskCtx, c.ch, c.pos.x | 0, c.pos.y | 0, 4, "#fff");
    }
    bounceLayer.render(time, mask, [0, 0, ctx.canvas.width, ctx.canvas.height]);

    // Shadow pass
    maskCtx.clearRect(0, 0, mask.width, mask.height);
    for (let f of floatingChars) {
      const y = f.baseY + Math.sin(time * 2 + f.offset) * 3;
      drawText(maskCtx, f.ch, f.baseX + 1, y + 1, 4, "#fff");
    }
    shadowLayer.render(time, mask, [0, 0, ctx.canvas.width, ctx.canvas.height]);

    // Float pass
    maskCtx.clearRect(0, 0, mask.width, mask.height);
    for (let f of floatingChars) {
      const y = f.baseY + Math.sin(time * 2 + f.offset) * 3;
      drawText(maskCtx, f.ch, f.baseX, y, 4, "#fff");
    }
    floatLayer.render(time, mask, [0, 0, ctx.canvas.width, ctx.canvas.height]);
  }
};
