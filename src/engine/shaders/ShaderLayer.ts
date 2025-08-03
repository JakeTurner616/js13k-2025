// src/engine/shaders/ShaderLayer.ts

export function createShaderLayer(g: WebGLRenderingContext, c: HTMLCanvasElement, f: string) {
  const B = 34962, S = 3553;

  const sh = (type: number, src: string): WebGLShader => {
    const s = g.createShader(type)!;
    g.shaderSource(s, src);
    g.compileShader(s);
    return s;
  };

  const p = g.createProgram()!;
  g.attachShader(p, sh(35633, "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}"));
  g.attachShader(p, sh(35632, f));
  g.linkProgram(p);

  const b = g.createBuffer()!;
  g.bindBuffer(B, b);
  g.bufferData(B, new Float32Array([-1, -1, 3, -1, -1, 3]), 35044);

  const t = g.createTexture()!;
  g.bindTexture(S, t);
  for (let i = 10242; i <= 10243; i++) g.texParameteri(S, i, 33071);
  for (let i = 10240; i <= 10241; i++) g.texParameteri(S, i, 9728);

  return {
    render(T: number, m: HTMLCanvasElement, r: [number, number, number, number]) {
      const x = r[0], y = r[1], w = r[2], h = r[3];
      const fy = c.height - y - h;

      g.viewport(x, fy, w, h);
      g.useProgram(p);

      const a = g.getAttribLocation(p, "p");
      g.enableVertexAttribArray(a);
      g.bindBuffer(B, b);
      g.vertexAttribPointer(a, 2, 5126, false, 0, 0);

      g.activeTexture(33984);
      g.bindTexture(S, t);
      g.texImage2D(S, 0, 6408, 6408, 5121, m);

      g.uniform1i(g.getUniformLocation(p, "sprite"), 0);
      g.uniform1f(g.getUniformLocation(p, "t"), T);
      g.uniform2f(g.getUniformLocation(p, "r"), c.width, c.height);
      g.uniform2f(g.getUniformLocation(p, "u_offset"), x, fy);

      g.drawArrays(4, 0, 3);
    },

    setUniform(name: string, v: number | [number, number]) {
      const loc = g.getUniformLocation(p, name);
      if (typeof v === "number") g.uniform1f(loc, v);
      else g.uniform2f(loc, v[0], v[1]);
    },

    dispose() {
      g.deleteProgram(p);
      g.deleteBuffer(b);
      g.deleteTexture(t);
    }
  };
}
