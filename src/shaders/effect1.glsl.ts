export const stylishText1 = `
precision mediump float;
uniform float t;
uniform vec2 r, u_offset;
uniform sampler2D sprite;
void main() {
  vec2 uv = (gl_FragCoord.xy - u_offset) / r;
  uv.y = 1. - uv.y;
  vec2 c = uv - 0.5;
  float d = length(c);
  float pulse = 0.5 + 0.5 * sin(25.0 * d - t * 4.0);
  vec4 tex = texture2D(sprite, uv);
  if (tex.a < 0.1) discard;
  gl_FragColor = vec4(tex.rgb * pulse, tex.a);
}
`;
