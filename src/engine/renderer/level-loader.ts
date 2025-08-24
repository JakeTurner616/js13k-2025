import {LEVEL_1_BASE64 as b,LEVEL_1_WIDTH as w,LEVEL_1_HEIGHT as h} from"../../levels/level1.ts";
import{setSolidTiles as s}from"../../player/Physics.ts";
import{setCurrentMap as m,getCurrentMap as g}from"./MapContext.ts";
/**
 * Decodes a custom base64-encoded string into a Uint32Array.
 *
 * The input string is base64-decoded, then interpreted as pairs of bytes:
 * - The first byte of each pair is repeated a number of times specified by the second byte.
 * - The result is a Uint32Array containing the expanded values.
 *
 * @param a - The base64-encoded string to decode.
 * @returns A Uint32Array containing the expanded values.
 *
 * @remarks
 * This function is optimized for compactness and may be used for level or asset data decoding.
 */
function d(a:string){let r=atob(a),l=r.length,B=new Uint8Array(l),t=0;for(let i=0;i<l;i++)B[i]=r.charCodeAt(i);for(let i=1;i<l;i+=2)t+=B[i];let o=new Uint32Array(t),j=0;for(let i=0;i<l;i+=2)for(let k=0;k<B[i+1];k++)o[j++]=B[i];return o}
export function loadLevel1(){let t=d(b),M={width:w,height:h,tiles:t};m(M);let S=new Set<number>();for(let i=0;i<t.length;i++)t[i]&&S.add(t[i]);s([...S])}
export{g as getCurrentMap};
