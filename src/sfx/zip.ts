// zzfx params: p,k,b,e,r,t,q,D,u,y,v,z,l,E,A,F,c,w,m,B
// Snappy zap w/ a tiny click, short tail.
export const zip = [
  1.0,  // p  volume
  0.03, // k  randomness
  740,  // b  base freq
  0.00, // e  attack
  0.00, // r  sustain
  0.05, // t  release
  0,    // q  shape (0=sin,1=square,2=saw,3=triangle,4=whistle)
  1.20, // D  shape curve
  0,    // u  slide
  0,    // y  delta slide
  0,    // v  pitch jump
  0,    // z  repeat speed
  0,    // l  noise
  0.25, // E  modulation
  0,    // A  mod freq
  0,    // F  lowpass freq slide rate
  0.00, // c  lowpass freq
  0.90, // w  lowpass resonance (keep <1 to avoid ringing)
  0.02, // m  highpass freq
  0     // B  bit crush
] as const;
