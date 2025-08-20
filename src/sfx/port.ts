// zzfx params: p,k,b,e,r,t,q,D,u,y,v,z,l,E,A,F,c,w,m,B
// Soft, fast “whoomp” with a little body.
export const port = [
  1.0,   // p  volume
  0.02,  // k  randomness
  1200,  // b  base freq
  0.01,  // e  attack
  0.06,  // r  sustain
  0.26,  // t  release
  4,     // q  shape (whistle-y for airy opening)
  1.80,  // D  shape curve
  -11.5, // u  slide (downward)
  9.2,   // y  delta slide (quick swoop)
  220,   // v  pitch jump
  0.03,  // z  repeat speed (subtle flutter)
  0.08,  // l  noise
  0.00,  // E  modulation
  0.50,  // A  mod freq (adds a bit of shimmer)
  0.00,  // F  lowpass slide
  0.02,  // c  lowpass freq
  0.65,  // w  resonance
  0.02,  // m  highpass freq
  0.28   // B  bit crush
] as const;
