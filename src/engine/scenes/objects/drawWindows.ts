import type { BuildingVariant } from "./types";

export function drawWindows(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  v: BuildingVariant,
  cL: number, cR: number,
  fwL: number, fwR: number,
  side: number, fh: number, depth: number,
  _time: number // no blinking; unused
) {
  // --- sizing ---
  const vMar = fh * 0.08, faceH = fh - vMar * 2;

  // --- base colors ---
  const baseL = v.wallLeftColor  || "#2a2a2f";
  const baseR = v.wallRightColor || "#232327";
  const d1 = "#1b1b20", d2 = "#16161a", m1 = "#34343b", m2 = "#2a2a30";

  // tiny stable hash 0..1
  const seed = (n:number)=>((Math.sin(n*12.9898)*43758.5453)%1+1)%1;

  // helper: fill an iso-vertical strip [u0..u1] across the wall width at Y band [y..y+h]
  function vstrip(bx:number, by:number, fw:number, left:boolean, dMul:number,
                  u0:number, u1:number, y0:number, h:number, color:string){
    const lx0 = u0*fw, lx1 = u1*fw;
    const x0  = bx + (left ? lx0*0.5 : lx0);
    const x1  = bx + (left ? lx1*0.5 : lx1);
    const d0  = (lx0/fw)*depth*dMul, d1 = (lx1/fw)*depth*dMul;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x0, y0 + d0);
    ctx.lineTo(x1, y0 + d1);
    ctx.lineTo(x1, y0 + d1 + h);
    ctx.lineTo(x0, y0 + d0 + h);
    ctx.closePath();
    ctx.fill();
  }

  // helper: fill an iso-horizontal band spanning full width at Y band [y..y+h]
  function hband(bx:number, by:number, fw:number, left:boolean, dMul:number,
                 y0:number, h:number, color:string){
    vstrip(bx, by, fw, left, dMul, 0, 1, y0, h, color);
  }

  // face renderer with several fascia variants
  function face(cols:number, bx:number, by:number, fw:number, dMul:number, left:boolean, base:string, varSeed:number){
    // base wash
    hband(bx, by+vMar, fw, left, dMul, by+vMar, faceH, base);

    // choose variant deterministically
    const vId = (varSeed*997|0) % 5;

    if (vId === 0){
      // Variant 0: chunky horizontal bands
      const bands = 4 + ((varSeed*13)|0)%3; // 4..6
      for (let i=0;i<bands;i++){
        const t = (i+1)/(bands+1), bh = faceH*(0.12);
        const y0 = by + vMar + t*faceH - bh*0.5;
        hband(bx, by, fw, left, dMul, y0, bh, (i&1)?m1:d1);
      }
    } else if (vId === 1){
      // Variant 1: thin slats (blinds)
      const slats = 12 + ((varSeed*19)|0)%8; // 12..19
      const gh = faceH / (slats*1.8);
      for (let i=0;i<slats;i++){
        const y0 = by + vMar + (i+0.5)*(faceH/slats) - gh*0.5;
        hband(bx, by, fw, left, dMul, y0, gh, (i%3===0)?m2:d2);
      }
    } else if (vId === 2){
      // Variant 2: stepped bands (band + inset strip)
      const bands = 3 + ((varSeed*17)|0)%4; // 3..6
      for (let i=0;i<bands;i++){
        const t = (i+1)/(bands+1), bh = faceH*0.13, y0 = by + vMar + t*faceH - bh*0.5;
        hband(bx, by, fw, left, dMul, y0, bh, m2);
        // inset highlight strip
        const ih = Math.max(2, bh*0.22);
        const iy = y0 + bh*0.5 - ih*0.5;
        vstrip(bx, by, fw, left, dMul, 0.06, 0.94, iy, ih, m1);
      }
    } else if (vId === 3){
      // Variant 3: vertical pilasters + caps
      const pN = Math.max(2, Math.min(5, ((cols|0)>>1)||3));
      const pW = 0.05 + (varSeed*0.02);
      for (let i=1;i<=pN;i++){
        const u = i/(pN+1);
        vstrip(bx, by, fw, left, dMul, u-pW*0.5, u+pW*0.5, by+vMar, faceH, d1);
      }
      // top & bottom caps
      const ch = faceH*0.06;
      hband(bx, by, fw, left, dMul, by+vMar, ch, m1);
      hband(bx, by, fw, left, dMul, by+vMar+faceH-ch, ch, m1);
    } else {
      // Variant 4: mixed — pilasters + sparse bands
      const pN = 2 + ((varSeed*23)|0)%3; // 2..4
      const pW = 0.04;
      for (let i=1;i<=pN;i++){
        const u = i/(pN+1);
        vstrip(bx, by, fw, left, dMul, u-pW*0.5, u+pW*0.5, by+vMar, faceH, d2);
      }
      const bands = 2 + ((varSeed*29)|0)%2; // 2..3
      for (let i=0;i<bands;i++){
        const y0 = by + vMar + (i+1)*(faceH/(bands+1)) - faceH*0.045;
        hband(bx, by, fw, left, dMul, y0, faceH*0.09, m2);
      }
    }

    // subtle near-edge accent
    const eW = fw*(left?0.06:0.05);
    vstrip(bx, by, fw, left, dMul, 0, (left?eW*2/fw:eW/fw), by+vMar, faceH, "#ffffff10");
  }

  // seeds per face (stable by variant fields)
  const sL = seed((v as any).blinkOffset ?? v.colsLeft ?? 3);
  const sR = seed(((v as any).blinkOffset ?? v.colsRight ?? 4) + 0.37);

  // LEFT face
  face(cL, x, y, fwL,  1, true,  baseL, sL);

  // RIGHT face
  face(cR, x + side, y + depth, fwR, -1, false, baseR, sR);
}
