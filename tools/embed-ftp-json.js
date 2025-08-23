// tools/embed-ftp-json.js
import fs from "fs";
import path from "path";

const SRC_JSON = path.resolve("src/assets/packed/animations/texture.json");
const OUT_DIR  = path.resolve("src/assets/packed/animations");
const OUT_TS   = path.join(OUT_DIR, "texture.ts");
const OUT_MAP  = path.join(OUT_DIR, "textureNames.ts");

// Friendly names (your runtime uses these) paired with the original TP keys.
// Order matters: it drives the a..g token assignment for determinism.
const ENTRIES = [
  ["idle",   "1_Alternative_Colour_Cat_Idle-Sheet"],
  ["jump",   "3_Alternative_Colour_Cat_Jump-Sheet"],
  ["fall",   "4_Alternative_Colour_Cat_Fall-Sheet"],
  ["dash",   "6_Alternative_Colour_Cat_Dash-Sheet"],
  ["ledge",  "8_Alternative_Colour_Cat_Ledge_Grab_Idle-Sheet"],
  ["death",  "18_Alternative_Colour_Cat_Death-Sheet"],
  ["portal", "portals-Sheet"]
];

const raw = fs.readFileSync(SRC_JSON, "utf8");
const src = JSON.parse(raw);
const framesSrc = src?.frames || {};

const letters = "abcdefghijklmnopqrstuvwxyz";
const tokenForIndex = i => letters[i] || `k${i}`; // just in case

const outFrames = {};
const nameToKey = {};

let idx = 0;
for (const [friendly, longKey] of ENTRIES) {
  const f = framesSrc[longKey];
  if (!f || !f.frame) continue;

  const fr = f.frame;
  const token = tokenForIndex(idx++);
  nameToKey[friendly] = token;

  // Compact entry: keep only non-trivial sss/src; rename props to f/sss/src
  const entry = { f: { x: fr.x|0, y: fr.y|0, w: fr.w|0, h: fr.h|0 } };

  const sss = f.spriteSourceSize;
  if (sss) {
    const x = sss.x|0, y = sss.y|0, w = sss.w|0, h = sss.h|0;
    if (x || y || w !== fr.w || h !== fr.h) entry.sss = { x, y, w, h };
  }

  const srcSize = f.sourceSize;
  if (srcSize) {
    const w = srcSize.w|0, h = srcSize.h|0;
    if (w !== fr.w || h !== fr.h) entry.src = { w, h };
  }

  outFrames[token] = entry;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

// texture.ts — compact JSON-as-TS
const ts = `// Auto-generated — do not edit
export default ${JSON.stringify({ frames: outFrames })} as const;
`;
fs.writeFileSync(OUT_TS, ts);

// textureNames.ts — friendly → tiny key
const nm = `// Auto-generated — do not edit
export const nameToKey = ${JSON.stringify(nameToKey)} as const;
`;
fs.writeFileSync(OUT_MAP, nm);

console.log("✔ Emitted:", OUT_TS, `(${ts.length} bytes)`);
console.log("✔ Emitted:", OUT_MAP, `(${nm.length} bytes)`);
