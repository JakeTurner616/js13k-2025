// src/engine/MaskBuffer.ts

export class MaskBuffer {
  c: HTMLCanvasElement;
  x: CanvasRenderingContext2D;

  constructor(w: number, h: number) {
    this.c = document.createElement("canvas");
    this.c.width = w;
    this.c.height = h;
    this.x = this.c.getContext("2d")!;
  }

  clear() {
    this.x.clearRect(0, 0, this.c.width, this.c.height);
  }
}
