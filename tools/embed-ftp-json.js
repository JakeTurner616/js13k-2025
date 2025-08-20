// tools/embed-ftp-json.js
import fs from "fs";
import path from "path";

const SRC_JSON = path.resolve("src/assets/packed/animations/texture.json");
const OUT_TS   = path.resolve("src/assets/packed/animations/texture.ts");

// Keep only the sheets we actually use in code.
const USED = new Set([
  "18_Alternative_Colour_Cat_Death-Sheet",
  "1_Alternative_Colour_Cat_Idle-Sheet",
  "8_Alternative_Colour_Cat_Ledge_Grab_Idle-Sheet",
  "6_Alternative_Colour_Cat_Dash-Sheet",
  "3_Alternative_Colour_Cat_Jump-Sheet",
  "4_Alternative_Colour_Cat_Fall-Sheet",
  "portals-Sheet",
]);

const raw = fs.readFileSync(SRC_JSON, "utf8");
const src = JSON.parse(raw);

// Build a minimal { frames: { key: { f, sss?, src? } } } object.
const outFrames = {};
const frames = src?.frames || {};

for (const k in frames) {
  if (!USED.has(k)) continue;

  const f = frames[k];
  const fr = f?.frame;
  if (!fr) continue;

  // Shorten keys:
  const entry = { f: { x: fr.x|0, y: fr.y|0, w: fr.w|0, h: fr.h|0 } };

  // spriteSourceSize -> sss (only if non-zero offsets or size differs)
  const sss = f?.spriteSourceSize;
  if (sss) {
    const offX = sss.x|0, offY = sss.y|0;
    const needSSS = offX !== 0 || offY !== 0 || (sss.w|0)!==(fr.w|0) || (sss.h|0)!==(fr.h|0);
    if (needSSS) entry.sss = { x: offX, y: offY, w: sss.w|0, h: sss.h|0 };
  }

  // sourceSize -> src (only if different from frame size)
  const srcSize = f?.sourceSize;
  if (srcSize) {
    const needSRC = (srcSize.w|0)!==(fr.w|0) || (srcSize.h|0)!==(fr.h|0);
    if (needSRC) entry.src = { w: srcSize.w|0, h: srcSize.h|0 };
  }

  outFrames[k] = entry;
}

// Final minimal object — no 'meta' payload.
const minimal = { frames: outFrames };

// Emit as a single default export, no temp const, fully minified.
const body = JSON.stringify(minimal);
const ts = `// Auto-generated from texture.json — do not edit
export default ${body} as const;
`;

fs.mkdirSync(path.dirname(OUT_TS), { recursive: true });
fs.writeFileSync(OUT_TS, ts);
console.log("✔ Emitted compact TS module:", OUT_TS, `(${ts.length} bytes)`);
