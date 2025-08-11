// src/shaders/backgroundAtmosphere.glsl.ts
import { SHADER_HEADER } from "./ShaderHeader";

export const backgroundAtmosphere = SHADER_HEADER + `
void main() {
  vec2 uv = (gl_FragCoord.xy - u_offset) / r;
  uv.y = 1.0 - uv.y;

  vec4 tex = texture2D(sprite, uv);
  if (tex.a < 0.1) discard;

  float yfade = smoothstep(0.3, 0.9, uv.y);
  float wiggle = sin((uv.y + t * 0.1) * 10.0) * 0.01;

  uv.x += wiggle;
  vec3 col = mix(tex.rgb, vec3(0.2, 0.3, 0.6), yfade);
  gl_FragColor = vec4(col, tex.a);
}`;
