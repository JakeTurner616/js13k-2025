export const stylishText2 = `
precision mediump float;
uniform float t;
uniform vec2 r, u_offset;
uniform sampler2D sprite;
void main() {
  vec2 uv = (gl_FragCoord.xy - u_offset) / r;
  uv.y = 1. - uv.y;
  vec4 tex = texture2D(sprite, uv);
  if (tex.a < 0.1) discard;
  float scan = sin((uv.y + t * 0.25) * 80.0) * 0.15;
  float hue = fract(t * 0.1 + uv.x + uv.y);
  vec3 col = vec3(abs(hue - 0.5) * 2.0, hue, 1.0 - hue);
  col = clamp(col + scan, 0.0, 1.0);
  gl_FragColor = vec4(col * tex.rgb, tex.a);
}
`;
