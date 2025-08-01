// src/engine/ShaderLayer.ts

export class ShaderLayer {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private prog: WebGLProgram;
  private buf: WebGLBuffer;
  private tex: WebGLTexture;

  constructor(
    canvas: HTMLCanvasElement,
    frag: string,
    vert: string = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}"
  ) {
    this.canvas = canvas;
    this.gl = this.canvas.getContext("webgl")!;
    this.buf = this.gl.createBuffer()!;
    this.tex = this.gl.createTexture()!;

    const gl = this.gl;

    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, vert);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, frag);
    gl.compileShader(fs);

    this.prog = gl.createProgram()!;
    gl.attachShader(this.prog, vs);
    gl.attachShader(this.prog, fs);
    gl.linkProgram(this.prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );

    // Bind texture
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  }

drawMasked(
  time: number,
  maskCanvas: HTMLCanvasElement,
  bounds: [number, number, number, number]
) {
  const gl = this.gl;
  gl.useProgram(this.prog);

  const t = gl.getUniformLocation(this.prog, "t");
  const r = gl.getUniformLocation(this.prog, "r");
  const offset = gl.getUniformLocation(this.prog, "u_offset");

  const [x, y, w, h] = bounds;

  // Flip Y to match WebGL's bottom-left origin
  const flippedY = this.canvas.height - (y + h);

  gl.uniform1f(t, time);
  gl.uniform2f(r, this.canvas.width, this.canvas.height);
  gl.uniform2f(offset, x, flippedY);

  // Upload texture
  const texLoc = gl.getUniformLocation(this.prog, "sprite");
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, this.tex);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    maskCanvas
  );
  gl.uniform1i(texLoc, 0);

  // Setup vertices
  const p = gl.getAttribLocation(this.prog, "p");
  gl.enableVertexAttribArray(p);
  gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
  gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);

  // Align viewport position correctly (Y flipped)
  gl.viewport(x, flippedY, w, h);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
}
