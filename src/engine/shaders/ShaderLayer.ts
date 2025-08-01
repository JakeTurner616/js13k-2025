// src/engine/shaders/ShaderLayer.ts

export class ShaderLayer {
  gl: WebGLRenderingContext;
  p: WebGLProgram;
  b: WebGLBuffer;
  t: WebGLTexture;
  c: HTMLCanvasElement;

  constructor(c: HTMLCanvasElement, f: string) {
    const g = c.getContext("webgl")!;
    this.c = c;
    this.gl = g;
    this.b = g.createBuffer()!;
    this.t = g.createTexture()!;
    const v = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
    const vs = g.createShader(g.VERTEX_SHADER)!;
    g.shaderSource(vs, v);
    g.compileShader(vs);
    const fs = g.createShader(g.FRAGMENT_SHADER)!;
    g.shaderSource(fs, f);
    g.compileShader(fs);
    const p = g.createProgram()!;
    g.attachShader(p, vs);
    g.attachShader(p, fs);
    g.linkProgram(p);
    this.p = p;
    g.bindBuffer(g.ARRAY_BUFFER, this.b);
    g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), g.STATIC_DRAW);
    g.bindTexture(g.TEXTURE_2D, this.t);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.NEAREST);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.NEAREST);
  }

  drawMasked(t: number, m: HTMLCanvasElement, b: [number, number, number, number]) {
    const g = this.gl;
    const [x, y, w, h] = b;
    const fy = this.c.height - (y + h);
    g.viewport(x, fy, w, h);
    g.useProgram(this.p);
    const a = g.getAttribLocation(this.p, "p");
    g.enableVertexAttribArray(a);
    g.bindBuffer(g.ARRAY_BUFFER, this.b);
    g.vertexAttribPointer(a, 2, g.FLOAT, false, 0, 0);
    g.activeTexture(g.TEXTURE0);
    g.bindTexture(g.TEXTURE_2D, this.t);
    g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, m);
    g.uniform1i(g.getUniformLocation(this.p, "sprite"), 0);
    g.uniform1f(g.getUniformLocation(this.p, "t"), t);
    g.uniform2f(g.getUniformLocation(this.p, "r"), this.c.width, this.c.height);
    g.uniform2f(g.getUniformLocation(this.p, "u_offset"), x, fy);
    g.drawArrays(g.TRIANGLES, 0, 3);
  }
}
