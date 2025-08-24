// A customized, slightly de-minified version of ZzFXMicro v1.3.1
// This function procedurally synthesizes sound effects using Web Audio API — no assets required.
// This version is hand-tweaked for TypeScript, but keeps the original micro zzfxM logic.

// ---- globals (match your original) ----
let zzfxV = 0.3, zzfxR = 44100, zzfxX = new AudioContext();

// ---- SILENT generator: identical to zzfx() but DOES NOT PLAY (needed by zzfxM) ----
export function zzfxG(
  p=1,k=0.05,b=220,e=0,r=0,t=0.1,q=0,D=1,u=0,y=0,v=0,z=0,l=0,E=0,A=0,F=0,c=0,w=1,m=0,B=0,N=0
){
  let M=Math,d=2*M.PI,R=44100,G=(u*=500*d/R/R),C=(b*=(1-k+2*k*M.random())*d/R),g=0,H=0,a=0,n=1,I=0,J=0,f=0,h=N<0?-1:1,x=d*h*N*2/R,L=M.cos(x),Z=M.sin,K=Z(x)/4,O=1+K,X=-2*L/O,Y=(1-K)/O,P=(1+h*L)/2/O,Q=-(h+L)/O,S=P,T=0,U=0,V=0,W=0;
  e=R*e+9,m*=R,r*=R,t*=R,c*=R,y*=500*d/R**3,A*=d/R,v*=d/R,z*=R*z,l=R*l|0,p*=zzfxV;
  const kArr:number[]=[];
  for(h=e+m+r+t+c|0;a<h;kArr[a++]=f*p)
    ++J%(100*F|0)||(f=q?1<q?2<q?3<q?Z(g**3):M.max(M.min(M.tan(g),1),-1):1-(2*g/d%2+2)%2:1-4*M.abs(M.round(g/d)-g/d):Z(g),
    f=(l?1-B+B*Z(d*a/l):1)*(f<0?-1:1)*M.abs(f)**D*(a<e?a/e:a<e+m?1-(a-e)/m*(1-w):a<e+m+r?w:a<h-c?(h-a-c)/t*w:0),
    f=c?f/2+(c>a?0:(a<h-c?1:(h-a)/c)*kArr[a-c|0]/2/p):f,
    N&&(f=W=S*T+Q*(T=U)+P*(U=f)-Y*V-X*(V=W))),
    x=(b+=u+=y)*Math.cos(A*H++),g+=x+x*E*Z(a**5),
    n&&++n>z&&(b+=v,C+=v,n=0),!l||++I%l||(b=C,u=G,n=n||1);
  return kArr as any; // number[]
}

// ---- Player: your original zzfx() (plays & returns samples) ----
export function zzfx(p=1,k=0.05,b=220,e=0,r=0,t=0.1,q=0,D=1,u=0,y=0,v=0,z=0,l=0,E=0,A=0,F=0,c=0,w=1,m=0,B=0,N=0){
  let M=Math,d=2*M.PI,R=44100,G=(u*=500*d/R/R),C=(b*=(1-k+2*k*M.random())*d/R),g=0,H=0,a=0,n=1,I=0,J=0,f=0,h=N<0?-1:1,x=d*h*N*2/R,L=M.cos(x),Z=M.sin,K=Z(x)/4,O=1+K,X=-2*L/O,Y=(1-K)/O,P=(1+h*L)/2/O,Q=-(h+L)/O,S=P,T=0,U=0,V=0,W=0;
  e=R*e+9,m*=R,r*=R,t*=R,c*=R,y*=500*d/R**3,A*=d/R,v*=d/R,z*=R*z,l=R*l|0,p*=zzfxV;
  const kArr:number[]=[];
  for(h=e+m+r+t+c|0;a<h;kArr[a++]=f*p)
    ++J%(100*F|0)||(f=q?1<q?2<q?3<q?Z(g**3):M.max(M.min(M.tan(g),1),-1):1-(2*g/d%2+2)%2:1-4*M.abs(M.round(g/d)-g/d):Z(g),
    f=(l?1-B+B*Z(d*a/l):1)*(f<0?-1:1)*M.abs(f)**D*(a<e?a/e:a<e+m?1-(a-e)/m*(1-w):a<e+m+r?w:a<h-c?(h-a-c)/t*w:0),
    f=c?f/2+(c>a?0:(a<h-c?1:(h-a)/c)*kArr[a-c|0]/2/p):f,
    N&&(f=W=S*T+Q*(T=U)+P*(U=f)-Y*V-X*(V=W))),
    x=(b+=u+=y)*Math.cos(A*H++),g+=x+x*E*Z(a**5),
    n&&++n>z&&(b+=v,C+=v,n=0),!l||++I%l||(b=C,u=G,n=n||1);
  // Play sound
  const dB=zzfxX.createBuffer(1,h,R),s=zzfxX.createBufferSource();
  dB.getChannelData(0).set(kArr);
  s.buffer=dB,s.connect(zzfxX.destination),s.start();
  // Return samples for use in zzfxM
  return kArr;
}

// ---- EXACT ZzFXM v2.0.3 micro logic (just typed & with typed return) ----
export function zzfxM(n:any,f:any,t:any,e=125): [Float32Array, Float32Array] {
  let l:any,o:number,z:number,r:number,g:any,h:number,x:any,a:any,u:any,c:any,i:any,m:any,d:any,p:any,G:any,M=0,R:any[]=[],
      b:number[]=[],j:number[]=[],k=0,q=0,s=1,v:Record<string,any>={},
      w = (zzfxR/e*60)>>2;

  for(;s;k++)
    R=[s=a=d=m=0],
    t.map((eIdx:number,dIdx:number)=>{
      for(
        x=f[eIdx][k]||[0,0,0],
        s = Number(s) | Number(!!f[eIdx][k]),
        G = m + (f[eIdx][0].length - 2 - Number(!a)) * w,
        p=dIdx==t.length-1,
        o=2,r=m;
        o<x.length+p;
        a=++o
      ){
        for(
          g=x[o],
          u = ((o == x.length + p - 1 && p ? 1 : 0) || (c != (x[0] || 0) ? 1 : 0) | (g ? 1 : 0) | 0),
          z=0;
          z<w && a;
          (z++ > w - 99 && u) ? (i += (i < 1 ? 1 : 0) / 99) : 0
        )
          h=(1-i)*R[M++]/2||0,
          b[r]=(b[r]||0)-h*q+h,
          j[r]=(j[r++]||0)+h*q+h;

        g && (
          i=g%1,
          q=x[1]||0,
          (g|=0) && (
            R = v[`${c = x[M = 0] || 0},${g}`] = v[`${c},${g}`] || (
              l = [...n[c]],
              l[2] *= 2 ** ((g - 12) / 12),
              g > 0 ? zzfxG(...l) : []
            )
          )
        );
      }
      m=G;
    });

  return [new Float32Array(b), new Float32Array(j)];
}

// ---- stereo player (unchanged) ----
export function playZzfxMSong(l: Float32Array, r: Float32Array, loop = true) {
  const s = zzfxX.createBufferSource(), b = zzfxX.createBuffer(2, l.length, zzfxR);
  b.getChannelData(0).set(l); b.getChannelData(1).set(r);
  s.buffer = b; s.loop = loop; s.connect(zzfxX.destination); s.start();
  return s;
}
