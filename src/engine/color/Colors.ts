// src/engine/color/Colors.ts
// One tiny place for colors used across effects.
// Short export names help Terser; comments help humans.

/** Master palette (ordered so common colors sit up front). */
export const P = (
  '#fff,'+          // 0  white (stars, aim)
  '#d6e8f5,'+       // 1  cloud hi
  '#a7c7de,'+       // 2  cloud mid
  '#7da8c5,'+       // 3  cloud low
  '#090016,'+       // 4  sky grad stop A
  '#250040,'+       // 5  sky grad stop B
  '#1a1d2f,'+       // 6  sky grad stop C
  '#0b0c12,'+       // 7  sky grad stop D
  '#0b0e19,'+       // 8  far mtn top
  '#0a0b13,'+       // 9  far mtn bot
  '#121624,'+       // 10 mid mtn top
  '#0e111c,'+       // 11 mid mtn bot
  '#eef1fb,'+       // 12 moon disc hi
  '#d9dcec,'+       // 13 moon disc mid
  '#b7bed2,'+       // 14 moon disc low
  '#222,'+          // 15 neutral dark (building R face)
  '#333,'+          // 16 neutral
  '#444,'+          // 17 neutral
  '#555,'+          // 18 neutral
  '#666,'+          // 19 neutral
  '#0003,'+         // 20 subtle shadow band
  '#0004'           // 21 edge band
).split(',');

/** Neon RGB pairs for haze (use with rgba()). */
export const NEON = ['255,80,180','160,60,255'] as const;

/** Tiny helper to avoid repeating `rgba(${rgb},${a})` stringery. */
export const rgba = (rgb:string, a:number) => `rgba(${rgb},${a})`;
