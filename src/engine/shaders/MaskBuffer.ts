// src/engine/MaskBuffer.ts

export class MaskBuffer {
  c = document.createElement("canvas");
  x = this.c.getContext("2d")!;

  constructor(w: number, h: number) {
    this.c.width = w;
    this.c.height = h;
  }

  clear() {
    this.x.clearRect(0, 0, this.c.width, this.c.height);
  }
}