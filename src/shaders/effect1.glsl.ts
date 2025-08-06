import { SHADER_HEADER } from "./ShaderHeader";

export const stylishText1 =
  SHADER_HEADER +
  `void main(){vec2 u=(gl_FragCoord.xy-u_offset)/r;u.y=1.-u.y;vec2 c=u-.5;float d=length(c);float p=.5+.5*sin(25.*d-t*4.);vec4 t=texture2D(sprite,u);if(t.a<.1)discard;gl_FragColor=vec4(t.rgb*p,t.a);}`;
