export const stylishText = `
precision mediump float;
uniform float t;
uniform vec2 r, u_offset;
uniform sampler2D sprite;

void main() {
  vec2 uv = (gl_FragCoord.xy - u_offset) / r;
  uv.y = 1.0 - uv.y;

  vec4 tex = texture2D(sprite, uv);
  if (tex.a < 0.1) discard;

  float pulse = 0.5 + 0.5 * sin(t * 5.0 + uv.x * 10.0);
  gl_FragColor = vec4(tex.rgb * pulse, tex.a);
}
`;
