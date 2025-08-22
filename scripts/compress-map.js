// scripts/compress-map.js
// Super tiny: RLE-compress the first tile layer -> src/levels/level1.ts
// (Optional) write a debug JSON with the RLE blob baked in.

import fs from "fs";
import path from "path";

const inputPath      = "src/maps/map.json";
const outputJsonPath = "src/maps/map.rle.json";
const outputTsPath   = "src/levels/level1.ts";

// -------------------- RLE helpers --------------------
function compressLayerData(data) {
  const out = [];
  let i = 0;
  while (i < data.length) {
    const v = data[i];
    let run = 1;
    while (i + run < data.length && data[i + run] === v && run < 255) run++;
    out.push(v, run);
    i += run;
  }
  return out;
}

function encodeBase64RLE(u8) {
  return Buffer.from(u8).toString("base64");
}

// -------------------- main --------------------
async function main() {
  // read map.json
  const raw = fs.readFileSync(inputPath, "utf8");
  const map = JSON.parse(raw);

  // RLE compress first tilelayer only (extend later if needed)
  let compressedBase64 = "";
  for (const layer of map.layers) {
    if (layer.type === "tilelayer" && Array.isArray(layer.data)) {
      const rle = compressLayerData(layer.data);
      compressedBase64 = encodeBase64RLE(Uint8Array.from(rle));
      layer.data = compressedBase64;
      layer.encoding = "base64-rle";
      break;
    }
  }

  // Persist RLE’d map (debug/reference)
  fs.writeFileSync(outputJsonPath, JSON.stringify(map));

  // Write level1.ts payload
  fs.mkdirSync(path.dirname(outputTsPath), { recursive: true });
  fs.writeFileSync(
    outputTsPath,
`export const LEVEL_1_BASE64="${compressedBase64}";
export const LEVEL_1_WIDTH=${map.width};
export const LEVEL_1_HEIGHT=${map.height};
`
  );

  console.log(`✔ LEVEL_1_BASE64 written to: ${outputTsPath}`);
  console.log(`✔ RLE-compressed JSON written to: ${outputJsonPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
