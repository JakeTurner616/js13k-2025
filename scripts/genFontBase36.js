// tools/genFontBase36.js
// Generates src/engine/font/procFont.ts (base36 compressed 5x7 font renderer)

import fs from "fs";
import path from "path";

// Only the characters used in "HELLO WORLD!"
const FONT = {
  "H": [
    "#...#",
    "#...#",
    "#...#",
    "#####",
    "#...#",
    "#...#",
    "#...#"
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
  " ": [
    ".....",
    ".....",
    ".....",
    ".....",
    ".....",
    ".....",
    "....."
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
  "R": [
    "####.",
    "#...#",
    "#...#",
    "####.",
    "#.#..",
    "#..#.",
    "#...#"
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
  "!": [
    "..#..",
    "..#..",
    "..#..",
    "..#..",
    "..#..",
    ".....",
    "..#.."
  ]
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

  // Convert bit string to BigInt, then shift left so that bit 0 becomes MSB (bit 34)
  const value = BigInt("0b" + bits) << BigInt(0); // Already MSB-first if you interpret bits[0] = bit 34
  const shifted = value << BigInt(0); // optional, no-op
  const hex = shifted.toString(36).padStart(7, "0");

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
const glyphMap = usedChars.join("");
const encodedData = usedChars.map(c => encodeGlyph(FONT[c])).join("");

const output = generateRuntimeCode(glyphMap, encodedData);
const outFile = path.resolve("src/engine/font/procFont.ts");
fs.writeFileSync(outFile, output);
console.log("✅ Font generated:", outFile);
