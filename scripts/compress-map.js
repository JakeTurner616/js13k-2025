// scripts/compress-map.js
import fs from "fs";
import path from "path";

const inputPath = "src/maps/map.json";
const outputJsonPath = "src/maps/map.rle.json";
const outputTsPath = "src/levels/level1.ts";

// Compresses using RLE: [value, runLength]
function compressLayerData(data) {
  const out = [];
  let i = 0;
  while (i < data.length) {
    const val = data[i];
    let run = 1;
    while (i + run < data.length && data[i + run] === val && run < 255) {
      run++;
    }
    out.push(val, run);
    i += run;
  }
  return out;
}

function encodeBase64RLE(array) {
  return btoa(String.fromCharCode(...array));
}

function main() {
  const raw = fs.readFileSync(inputPath, "utf8");
  const map = JSON.parse(raw);

  let compressedBase64 = "";

  for (const layer of map.layers) {
    if (layer.type === "tilelayer" && Array.isArray(layer.data)) {
      const rleData = compressLayerData(layer.data);
      const u8 = Uint8Array.from(rleData);
      compressedBase64 = encodeBase64RLE(u8);

      // Store metadata for clarity
      layer.data = compressedBase64;
      layer.encoding = "base64-rle";
    }
  }

  fs.writeFileSync(outputJsonPath, JSON.stringify(map));

  fs.mkdirSync(path.dirname(outputTsPath), { recursive: true });

  fs.writeFileSync(outputTsPath, `export const LEVEL_1_BASE64 = "${compressedBase64}";
export const LEVEL_1_WIDTH = ${map.width};
export const LEVEL_1_HEIGHT = ${map.height};
`);

  console.log(`✔ RLE-compressed JSON written to: ${outputJsonPath}`);
  console.log(`✔ LEVEL_1_BASE64 written to:     ${outputTsPath}`);
}

main();
