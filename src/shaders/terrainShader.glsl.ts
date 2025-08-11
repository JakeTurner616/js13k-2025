// src/shaders/terrainShader.glsl.ts
import { SHADER_HEADER } from "./ShaderHeader";

export const terrainShader = SHADER_HEADER + `
highp float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - u_offset) / r;
  uv.y = 1.0 - uv.y;

  vec4 tex = texture2D(sprite, uv);
  if (tex.a < 0.1) discard;

  float depth = uv.y;

  // Depth-based atmosphere gradient
  vec3 haze = mix(vec3(0.08, 0.1, 0.15), vec3(0.8, 0.9, 1.0), depth);
  float scatter = smoothstep(0.2, 1.0, depth);

  // Fade near bottom, soft highlight mid-depth
  float rim = smoothstep(0.2, 0.8, depth) * (1.0 - pow(abs(depth - 0.5), 1.5));

  // Slight shimmer (not scanlines)
  float noise = (hash(uv * 240.0 + t * 0.2) - 0.5) * 0.003;
  uv.x += noise;

  // Blend terrain color with haze
  vec3 base = tex.rgb * mix(vec3(1.0), haze, scatter);

  gl_FragColor = vec4(base * rim, tex.a);
}`;
