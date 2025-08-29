// tools/genFontBase36.js
// Generates src/engine/font/procFont.ts (base36 compressed 5x7 font renderer)

import fs from "fs";
import path from "path";

/**
 * 5x7 bitmap glyphs.
 * Rows are 5 chars wide using '#' for on and '.' for off.
 * Keep 7 rows per glyph.
 */
const FONT = {
  // ==== Uppercase set for NES-style text ====

  "A": [
    ".###.",
    "#...#",
    "#...#",
    "#####",
    "#...#",
    "#...#",
    "#...#"
  ],
  "C": [
    ".###.",
    "#...#",
    "#....",
    "#....",
    "#....",
    "#...#",
    ".###."
  ],
  "D": [
    "####.",
    "#...#",
    "#...#",
    "#...#",
    "#...#",
    "#...#",
    "####."
  ],
  "E": [
    "#####",
    "#....",
    "###..",
    "#....",
    "#....",
    "#....",
    "#####"
  ],
  "H": [
    "#...#",
    "#...#",
    "#...#",
    "#####",
    "#...#",
    "#...#",
    "#...#"
  ],
  "I": [
    "#####",
    "..#..",
    "..#..",
    "..#..",
    "..#..",
    "..#..",
    "#####"
  ],
  "K": [
    "#...#",
    "#..#.",
    "###..",
    "#..#.",
    "#...#",
    "#...#",
    "#...#"
  ],
  "L": [
    "#....",
    "#....",
    "#....",
    "#....",
    "#....",
    "#....",
    "#####"
  ],
  "O": [
    ".###.",
    "#...#",
    "#...#",
    "#...#",
    "#...#",
    "#...#",
    ".###."
  ],
  "P": [
    "####.",
    "#...#",
    "#...#",
    "####.",
    "#....",
    "#....",
    "#...."
  ],
  "R": [
    "####.",
    "#...#",
    "#...#",
    "####.",
    "#.#..",
    "#..#.",
    "#...#"
  ],
  "S": [
    ".####",
    "#....",
    "#....",
    ".###.",
    "....#",
    "....#",
    "####."
  ],
  "T": [
    "#####",
    "..#..",
    "..#..",
    "..#..",
    "..#..",
    "..#..",
    "..#.."
  ],
  "W": [
    "#...#",
    "#...#",
    "#...#",
    "#.#.#",
    "#.#.#",
    "##.##",
    "#...#"
  ],

  " ": [
    ".....",
    ".....",
    ".....",
    ".....",
    ".....",
    ".....",
    "....."
  ],
  "/": [
    "....#",
    "...#.",
    "..#..",
    ".#...",
    "#....",
    ".....",
    "....."
  ],
  "!": [
    "..#..",
    "..#..",
    "..#..",
    "..#..",
    "..#..",
    ".....",
    "..#.."
  ],
    "F": [
    "#####",
    "#....",
    "###..",
    "#....",
    "#....",
    "#....",
    "#...."
  ],
  "Y": [
    "#...#",
    "#...#",
    ".#.#.",
    "..#..",
    "..#..",
    "..#..",
    "..#.."
  ],

};

// === Utilities ===

function encodeGlyph(rows, char) {
  let bits = "";

  console.log(`\n=== ${char} ===`);

  for (let y = 0; y < 7; y++) {
    let rowBits = "";
    for (let x = 0; x < 5; x++) {
      const pixel = rows[y][x] === "#" ? "1" : "0";
      bits += pixel;
      rowBits += pixel;
      const bitIndex = y * 5 + x;
      if (bitIndex === 0 || bitIndex === 34) {
        console.log(`BIT ${bitIndex} (${x},${y}) = ${pixel}`);
      }
    }
    console.log(`ROW ${y}: ${rows[y]}  ->  ${rowBits.replace(/0/g, ".").replace(/1/g, "#")}`);
  }

  if (bits.length !== 35) {
    console.warn(`⚠️  Expected 35 bits for '${char}', got ${bits.length}`);
  }

  // MSB-first packing to base36 (7 chars)
  const value = BigInt("0b" + bits);
  const hex = value.toString(36).padStart(7, "0");

  console.log(`Base36: ${hex}`);
  return hex;
}

function generateRuntimeCode(glyphMap, encodedData) {
  return `// Auto-generated font (base36 compressed 5x7)

export const glyphs: string = "${glyphMap}";
export const data: string = "${encodedData}";

`;
}

// === Main ===

const usedChars = Object.keys(FONT);
// Keep deterministic order so glyph→data alignment is stable
usedChars.sort((a, b) => a.localeCompare(b));

const glyphMap = usedChars.join("");
const encodedData = usedChars.map(c => encodeGlyph(FONT[c], c)).join("");

const output = generateRuntimeCode(glyphMap, encodedData);
const outFile = path.resolve("src/engine/font/procFont.ts");
fs.writeFileSync(outFile, output);
console.log("✅ Font generated:", outFile);
