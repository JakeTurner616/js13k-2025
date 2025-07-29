// scripts/compress-map.js
import fs from "fs";
import path from "path";
import { deflate } from "pako";

const inputPath = "src/maps/map.json";
const outputJsonPath = "src/maps/map.compressed.json";
const outputTsPath = "src/levels/level1.ts";

function compressLayerData(layerData) {
  const buffer = new ArrayBuffer(layerData.length * 4);
  const view = new DataView(buffer);
  for (let i = 0; i < layerData.length; i++) {
    view.setUint32(i * 4, layerData[i], true); // little-endian
  }

  const compressed = deflate(new Uint8Array(buffer));
  return btoa(String.fromCharCode(...compressed));
}

function main() {
  const raw = fs.readFileSync(inputPath, "utf8");
  const map = JSON.parse(raw);

  let compressedBase64 = "";

  for (const layer of map.layers) {
    if (layer.type === "tilelayer" && Array.isArray(layer.data)) {
      compressedBase64 = compressLayerData(layer.data);

      // Overwrite the layer with compressed + metadata
      layer.data = compressedBase64;
      layer.encoding = "base64";
      layer.compression = "zlib";
    }
  }

  // Write compressed JSON version (optional)
  fs.writeFileSync(outputJsonPath, JSON.stringify(map));

  // Ensure output directory exists
  fs.mkdirSync(path.dirname(outputTsPath), { recursive: true });

  // Write the compressed base64 string as TS export
  fs.writeFileSync(outputTsPath, `export const LEVEL_1_BASE64 = "${compressedBase64}";
export const LEVEL_1_WIDTH = ${map.width};
export const LEVEL_1_HEIGHT = ${map.height};
`);

  console.log(`✔ Compressed JSON written to: ${outputJsonPath}`);
  console.log(`✔ LEVEL_1_BASE64 written to:  ${outputTsPath}`);
}

main();
