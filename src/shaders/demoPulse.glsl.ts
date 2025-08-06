
import { SHADER_HEADER } from "./ShaderHeader";

export const demoFrag =
  SHADER_HEADER +
  `void main(){vec2 b=(gl_FragCoord.xy-u_offset)/48.;b.y=1.-b.y;vec4 c=texture2D(sprite,b);if(c.a<.01)discard;float d=.5+.5*sin(t*4.+b.y*20.);gl_FragColor=vec4(c.rgb*d,c.a);}`;
