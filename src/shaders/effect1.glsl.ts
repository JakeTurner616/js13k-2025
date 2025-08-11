import { SHADER_HEADER } from "./ShaderHeader";

export const stylishText1 =
  SHADER_HEADER +
  `void main() {
    vec2 uv = (gl_FragCoord.xy - u_offset) / r;
    uv.y = 1.0 - uv.y;

    vec4 tex = texture2D(sprite, uv);
    if (tex.a < 0.1) discard;

    // Soft flicker using position and time
    float flicker = 0.9 + 0.1 * sin(t * 3.0 + uv.x * 50.0 + uv.y * 80.0);

    // Simulate warm light tint (e.g. yellowish tone)
    vec3 warm = vec3(1.0, 0.9, 0.7);

    gl_FragColor = vec4(tex.rgb * warm * flicker, tex.a);
  }`;
