// tools/genFontBase36.js
// Generates src/engine/font/procFont.ts (base36-compressed 5x7 font)
// Only includes glyphs actually used by TEXT_SOURCES.

import fs from "fs";
import path from "path";

/** ===== Text actually used in-game =====
 * Keep this list authoritative so we only bake needed glyphs.
 * (Uppercasing happens automatically.)
 */
const TEXT_SOURCES = [
  // Menu
  "FLYKT",
  "CLICK / TAP TO START!",

  // Game Over / Credits
  "FLYKT",
  "A TINY GAME FOR",
  "JS13KGAMES.COM 2025",
  "SPECIAL THANKS TO",
  "JS13K COMMUNITY, FRIENDS, AND ALL MY SPECIAL PLAYTESTERS",
  "MADE WITH LOVE BY JAKE TURNER",
  "CLICK / TAP TO RETURN",
];

/** ===== 5x7 uppercase pixel font =====
 * Use only caps + minimal punctuation to keep it tiny.
 * Add shapes only if they appear in TEXT_SOURCES.
 */
const FONT = {
  "A":[".###.","#...#","#...#","#####","#...#","#...#","#...#"],
  "B":["####.","#...#","#...#","####.","#...#","#...#","####."],
  "C":[".###.","#...#","#....","#....","#....","#...#",".###."],
  "D":["####.","#...#","#...#","#...#","#...#","#...#","####."],
  "E":["#####","#....","###..","#....","#....","#....","#####"],
  "F":["#####","#....","###..","#....","#....","#....","#...."],
  "G":[".###.","#...#","#....","#..##","#...#","#...#",".###."],
  "H":["#...#","#...#","#...#","#####","#...#","#...#","#...#"],
  "I":["#####","..#..","..#..","..#..","..#..","..#..","#####"],
  "J":["..###","...#.","...#.","...#.","#..#.","#..#.",".##.."],
  "K":["#...#","#..#.","###..","#..#.","#...#","#...#","#...#"],
  "L":["#....","#....","#....","#....","#....","#....","#####"],
  "M":["#...#","##.##","#.#.#","#.#.#","#...#","#...#","#...#"],
  "N":["#...#","##..#","#.#.#","#..##","#...#","#...#","#...#"],
  "O":[".###.","#...#","#...#","#...#","#...#","#...#",".###."],
  "P":["####.","#...#","#...#","####.","#....","#....","#...."],
  "R":["####.","#...#","#...#","####.","#.#..","#..#.","#...#"],
  "S":[".####","#....","#....",".###.","....#","....#","####."],
  "T":["#####","..#..","..#..","..#..","..#..","..#..","..#.."],
  "U":["#...#","#...#","#...#","#...#","#...#","#...#",".###."],
  "V":["#...#","#...#","#...#","#...#",".#.#.",".#.#.","..#.."],
  "W":["#...#","#...#","#...#","#.#.#","#.#.#","##.##","#...#"],
  "Y":["#...#","#...#",".#.#.","..#..","..#..","..#..","..#.."],

  "0":[".###.","#...#","#...#","#...#","#...#","#...#",".###."],
  "1":["..#..",".##..","..#..","..#..","..#..","..#..",".###."],
  "2":[".###.","#...#","....#","...#.","..#..",".#...","#####"],
  "3":["####.","....#","....#",".###.","....#","....#","####."],
  "5":["#####","#....","#....","####.","....#","....#","####."],

  " ":[".....",".....",".....",".....",".....",".....","....."],
  ".":[".....",".....",".....",".....",".....","..#..","..#.."],
  ",":[".....",".....",".....",".....","..#..","..#..",".#..."],
  "/":["....#","...#.","..#..",".#...","#....",".....","....."],
  "!":["..#..","..#..","..#..","..#..","..#..",".....","..#.."],
};

/* ===== Build the exact glyph set we need ===== */
const needed = new Set(
  TEXT_SOURCES.join("")
    .toUpperCase()
    .split("")
    .filter(ch => ch in FONT)
);

const usedChars = Array.from(needed).sort(); // stable order

/* ===== Encode glyphs (MSB-first 35 bits → base36, 7 chars) ===== */
function encodeGlyph(rows, ch) {
  let bits = "";
  for (let y=0; y<7; y++) for (let x=0; x<5; x++) bits += (rows[y][x]==="#") ? "1" : "0";
  const v = BigInt("0b"+bits);
  return v.toString(36).padStart(7,"0");
}

const glyphMap   = usedChars.join("");
const encodedData= usedChars.map(c=>encodeGlyph(FONT[c],c)).join("");

/* ===== Emit runtime module ===== */
const out = `// Auto-generated font (base36 compressed 5x7) — ONLY used glyphs

export const glyphs: string = "${glyphMap}";
export const data: string = "${encodedData}";
`;

const outFile = path.resolve("src/engine/font/procFont.ts");
fs.writeFileSync(outFile, out);
console.log("✅ Font generated:", outFile);
console.log("Included glyphs:", glyphMap.split("").join(" "));
