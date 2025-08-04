export const stylishText3 = `
precision mediump float;
uniform float t;
uniform vec2 r, u_offset;
uniform sampler2D sprite;
void main() {
  vec2 uv = (gl_FragCoord.xy - u_offset) / r;
  uv.y = 1. - uv.y;
  float off = sin(t * 5.0 + uv.y * 10.0) * 0.01;
  vec4 rCh = texture2D(sprite, uv + vec2(-off, 0));
  vec4 gCh = texture2D(sprite, uv);
  vec4 bCh = texture2D(sprite, uv + vec2(off, 0));
  vec4 tex = vec4(rCh.r, gCh.g, bCh.b, gCh.a);
  if (tex.a < 0.1) discard;
  gl_FragColor = tex;
}
`;
