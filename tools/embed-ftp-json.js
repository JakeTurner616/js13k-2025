// tools/embed-ftp-json.js
import fs from "fs";
import path from "path";

const SRC_JSON = path.resolve("src/assets/packed/animations/texture.json");
const OUT_TS   = path.resolve("src/assets/packed/animations/texture.ts");

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
const outFrames = {};
for (const k in src?.frames || {}) {
  if (!USED.has(k)) continue;
  const f = src.frames[k];
  const fr = f?.frame; if (!fr) continue;

  const entry = { frame: { x: fr.x|0, y: fr.y|0, w: fr.w|0, h: fr.h|0 } };

  const sss = f?.spriteSourceSize;
  if (sss) {
    const x = sss.x|0, y = sss.y|0, w = sss.w|0, h = sss.h|0;
    if (x||y||w!==fr.w||h!==fr.h) entry.spriteSourceSize = { x, y, w, h };
  }

  const srcSize = f?.sourceSize;
  if (srcSize) {
    const w = srcSize.w|0, h = srcSize.h|0;
    if (w!==fr.w || h!==fr.h) entry.sourceSize = { w, h };
  }

  outFrames[k] = entry;
}

const minimal = { frames: outFrames };
const ts = `// Auto-generated from texture.json — do not edit
export default ${JSON.stringify(minimal)} as const;
`;
fs.mkdirSync(path.dirname(OUT_TS), { recursive: true });
fs.writeFileSync(OUT_TS, ts);
console.log("✔ Emitted compact TS module:", OUT_TS, `(${ts.length} bytes)`);
