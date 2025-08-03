// src/shaders/redPulse.glsl.ts

export const redPulse = `
precision mediump float;
uniform float t;
uniform vec2 r, u_offset;
uniform sampler2D sprite;
void main() {
  vec2 uv = (gl_FragCoord.xy - u_offset) / r;
  uv.y = 1.0 - uv.y;
  vec4 tex = texture2D(sprite, uv);
  if (tex.a < 0.1) discard;
  float glow = 0.5 + 0.5 * sin(t * 6.0);
  gl_FragColor = vec4(glow, 0.1, 0.1, tex.a);
}
`;
