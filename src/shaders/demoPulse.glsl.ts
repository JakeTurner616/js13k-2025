// Simple bloom pulse shader
export const demoFrag=`precision mediump float;uniform float t;uniform vec2 r,u_offset;uniform sampler2D sprite;void main(){vec2 u=(gl_FragCoord.xy-u_offset)/48.;u.y=1.-u.y;vec4 p=texture2D(sprite,u);if(p.a<.01)discard;float f=.5+.5*sin(t*4.+u.y*20.);gl_FragColor=vec4(p.rgb*f,p.a);}`;
