// A customized, slightly de-minified version of ZzFXMicro v1.3.1
// This function procedurally synthesizes sound effects using Web Audio API — no assets required.
// This version is hand-tweaked for typescript.
let zzfxV=0.3, zzfxR=44100, zzfxX=new AudioContext();
export function zzfx(p=1,k=0.05,b=220,e=0,r=0,t=0.1,q=0,D=1,u=0,y=0,v=0,z=0,l=0,E=0,A=0,F=0,c=0,w=1,m=0,B=0,N=0){
  let M=Math,d=2*M.PI,R=44100,G=(u*=500*d/R/R),C=(b*=(1-k+2*k*M.random())*d/R),g=0,H=0,a=0,n=1,I=0,J=0,f=0,h=N<0?-1:1,x=d*h*N*2/R,L=M.cos(x),Z=M.sin,K=Z(x)/4,O=1+K,X=-2*L/O,Y=(1-K)/O,P=(1+h*L)/2/O,Q=-(h+L)/O,S=P,T=0,U=0,V=0,W=0;
  e=R*e+9,m*=R,r*=R,t*=R,c*=R,y*=500*d/R**3,A*=d/R,v*=d/R,z*=R*z,l=R*l|0,p*=zzfxV;
  const kArr:number[]=[];
  for(h=e+m+r+t+c|0;a<h;kArr[a++]=f*p)
    ++J%(100*F|0)||(f=q?1<q?2<q?3<q?Z(g**3):M.max(M.min(M.tan(g),1),-1):1-(2*g/d%2+2)%2:1-4*M.abs(M.round(g/d)-g/d):Z(g),
    f=(l?1-B+B*Z(d*a/l):1)*(f<0?-1:1)*M.abs(f)**D*(a<e?a/e:a<e+m?1-(a-e)/m*(1-w):a<e+m+r?w:a<h-c?(h-a-c)/t*w:0),
    f=c?f/2+(c>a?0:(a<h-c?1:(h-a)/c)*kArr[a-c|0]/2/p):f,
    N&&(f=W=S*T+Q*(T=U)+P*(U=f)-Y*V-X*(V=W))),
    x=(b+=u+=y)*M.cos(A*H++),g+=x+x*E*Z(a**5),
    n&&++n>z&&(b+=v,C+=v,n=0),!l||++I%l||(b=C,u=G,n=n||1);
  // Play sound
  const dB=zzfxX.createBuffer(1,h,R),s=zzfxX.createBufferSource();
  dB.getChannelData(0).set(kArr);
  s.buffer=dB,s.connect(zzfxX.destination),s.start();
  // Return samples for use in zzfxM
  return kArr;
}
export function zzfxM(i: number[][], p: number[][][], s: number[], b = 125): [Float32Array, Float32Array] {
  const r = zzfxR, l: number[] = [], R: number[] = [], c: Record<string, number[]> = {}, n = (r * 60 / b) >> 2;
  for (let ch = 0, h = 1; h;) {
    h = 0;
    let x = 0;
    for (let si = 0; si < s.length; si++) {
      const t = p[s[si]], row = t[ch], [ins = 0, pan = 0] = row || [];
      h |= Number(!!row);
      for (let k = 2; k < (row?.length || 0); k++) {
        const note = row[k] || 0, key = ins + "|" + note;
        let v = c[key];
        if (!v && note) {
          const d = i[ins].slice();
          d[2] *= 2 ** ((note - 12) / 12);
          c[key] = v = zzfx(...d);
        }
        for (let j = 0; j < n; j++, x++) {
          const s = (v?.[j] || 0) / 2;
          l[x] = (l[x] || 0) + s * (1 - pan);
          R[x] = (R[x] || 0) + s * (1 + pan);
        }
      }
    }
    ch++;
  }
  return [new Float32Array(l), new Float32Array(R)];
}

export function playZzfxMSong(l: Float32Array, r: Float32Array, loop = true) {
  const s = zzfxX.createBufferSource(), b = zzfxX.createBuffer(2, l.length, zzfxR);
  b.getChannelData(0).set(l); b.getChannelData(1).set(r);
  s.buffer = b; s.loop = loop; s.connect(zzfxX.destination); s.start();
  return s;
}
