// src/engine/ShaderMaskPass.ts

export class ShaderMaskPass {
  private gl: WebGLRenderingContext;
  private prog: WebGLProgram;
  private buf: WebGLBuffer;
  private tex: WebGLTexture;

  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement, frag: string) {
    this.canvas = canvas;
    this.gl = canvas.getContext("webgl")!;
    this.buf = this.initBuffer();
    this.prog = this.initProgram(frag);
    this.tex = this.gl.createTexture()!;
  }

  private initProgram(frag: string): WebGLProgram {
    const gl = this.gl;
    const vert = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, vert);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, frag);
    gl.compileShader(fs);

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    return prog;
  }

  private initBuffer(): WebGLBuffer {
    const b = this.gl.createBuffer()!;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, b);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      this.gl.STATIC_DRAW
    );
    return b;
  }

  drawMasked(mask: HTMLCanvasElement, time: number, bounds: [number, number, number, number]) {
    const gl = this.gl;
    gl.viewport(...bounds);
    gl.useProgram(this.prog);

    const p = gl.getAttribLocation(this.prog, "p");
    gl.enableVertexAttribArray(p);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mask);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.uniform1i(gl.getUniformLocation(this.prog, "sprite"), 0);
    gl.uniform1f(gl.getUniformLocation(this.prog, "t"), time);
    gl.uniform2f(gl.getUniformLocation(this.prog, "r"), this.canvas.width, this.canvas.height);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
