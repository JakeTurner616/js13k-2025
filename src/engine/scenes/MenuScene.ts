import { createShaderLayer } from "../shaders/ShaderLayer";
import { setSolidTiles } from "../../player/Physics";
import { FloatingTitle } from "../components/FloatingTitle";
import { BouncingTitle } from "../components/BouncingTitle";
import { stylishText2 } from "../../shaders/effect2.glsl";

const TILE_SIZE = 32;
const TILE_COLS = 30;
const TEXT = "HELLO WORLD !";

const SHADERS = [stylishText2];
const USE_BOUNCE = false; // 🔁 toggle between bounce and float

let bounceLayer: ReturnType<typeof createShaderLayer>;
let floatLayer: ReturnType<typeof createShaderLayer>;
let shadowLayer: ReturnType<typeof createShaderLayer>;

let bouncing: BouncingTitle;
let floating: FloatingTitle;

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
    gl: HTMLCanvasElement,
    maskCtx: CanvasRenderingContext2D,
    mask: HTMLCanvasElement
  ) {
    this.__ctx = ctx;
    this.__glCanvas = gl;
    this.__maskCtx = maskCtx;
    this.__mask = mask;
  },

  start() {
    const gl = this.__glCanvas?.getContext("webgl");
    if (!gl) return;

    const h = this.__ctx!.canvas.height;
    const rows = Math.ceil(h / TILE_SIZE);
    this.__fakeMap = {
      width: TILE_COLS,
      height: rows,
      tiles: [...Array(TILE_COLS * (rows - 1)).fill(0), ...Array(TILE_COLS).fill(1)]
    };
    setSolidTiles([1]);

    if (USE_BOUNCE) {
      bouncing = new BouncingTitle(TEXT);
    } else {
      floating = new FloatingTitle(TEXT);
    }

    this.initShaderLayers(gl);

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
    if (USE_BOUNCE) {
      bouncing.update(t, this.__ctx, this.__fakeMap);
    }
  },

  draw(t: number) {
    const { __ctx: ctx, __maskCtx: maskCtx, __mask: mask } = this;
    if (!ctx || !mask || !maskCtx) return;

    const time = t / 1000;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Layer 1: Bounce or float shadow
    maskCtx.clearRect(0, 0, mask.width, mask.height);
    if (USE_BOUNCE) {
      bouncing.draw(maskCtx);
      bounceLayer.render(time, mask, [0, 0, ctx.canvas.width, ctx.canvas.height]);
    } else {
      floating.drawShadow(maskCtx, t);
      shadowLayer.render(time, mask, [0, 0, ctx.canvas.width, ctx.canvas.height]);
      maskCtx.clearRect(0, 0, mask.width, mask.height);
      floating.drawMain(maskCtx, t);
      floatLayer.render(time, mask, [0, 0, ctx.canvas.width, ctx.canvas.height]);
    }
  }
};
