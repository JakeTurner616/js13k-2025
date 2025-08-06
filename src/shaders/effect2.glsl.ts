//https://glsl-bundler.vercel.app/
export const stylishText2 = `
precision mediump float;uniform float t;uniform vec2 r,u_offset;uniform sampler2D sprite;void main(){vec2 b=(gl_FragCoord.xy-u_offset)/r;b.y=1.-b.y;vec4 c=texture2D(sprite,b);if(c.a<.1)discard;float d=sin((b.y+t*.25)*80.)*.15;float e=fract(t*.1+b.x+b.y);vec3 f=vec3(abs(e-.5)*2.,e,1.-e);f=clamp(f+d,.0,1.);gl_FragColor=vec4(f*c.rgb,c.a);}
`;
