import { SHADER_HEADER } from './ShaderHeader';

export const redPulse = SHADER_HEADER + `
void main(){vec2 d=(gl_FragCoord.xy-u_offset)/vec2(480.,270.);d.y=1.-d.y;vec4 e=texture2D(sprite,d);if(e.a<.1)discard;gl_FragColor=vec4(.5+.5*sin(t*6.),.1,.1,e.a);}
`;
