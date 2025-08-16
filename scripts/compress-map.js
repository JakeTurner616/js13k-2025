// scripts/compress-map.js
// 1) RLE-compress map layer -> src/levels/level1.ts
// 2) Build a skinny tiles image containing ONLY used GIDs -> src/assets/img/map-packed.png
// 3) Auto-generate src/atlas/tileAtlas.ts mapping GIDs -> {x,y,w,h} in that image

import fs from "fs";
import path from "path";
import sharp from "sharp";

const inputPath       = "src/maps/map.json";
const outputJsonPath  = "src/maps/map.rle.json";
const outputTsPath    = "src/levels/level1.ts";
const outPackedPng    = "src/assets/img/map-packed.png";
const outTileAtlasTs  = "src/atlas/tileAtlas.ts";

// -------------------- RLE helpers --------------------
function compressLayerData(data) {
  const out = [];
  let i = 0;
  while (i < data.length) {
    const val = data[i];
    let run = 1;
    while (i + run < data.length && data[i + run] === val && run < 255) run++;
    out.push(val, run);
    i += run;
  }
  return out;
}

// Node-friendly base64
function encodeBase64RLE(u8) {
  return Buffer.from(u8).toString("base64");
}

// -------------------- TSX parsing (minimal) --------------------
function parseTsxAttrs(tsxText) {
  // Works for: tilewidth, tileheight, columns, spacing?, margin?
  const g = (re, d = 0) => {
    const m = tsxText.match(re);
    return m ? parseInt(m[1], 10) : d;
  };
  const s = (re) => {
    const m = tsxText.match(re);
    return m ? m[1] : null;
  };

  const tilewidth  = g(/tilewidth="(\d+)"/);
  const tileheight = g(/tileheight="(\d+)"/);
  const columns    = g(/columns="(\d+)"/);
  const spacing    = g(/spacing="(\d+)"/, 0);
  const margin     = g(/margin="(\d+)"/, 0);
  const imageSrc   = s(/<image[^>]*source="([^"]+)"/);
  return { tilewidth, tileheight, columns, spacing, margin, imageSrc };
}

// Compute source crop for a gid
function cropRectForGid(gid, firstgid, columns, tw, th, spacing, margin) {
  const local = gid - firstgid;
  const sx = margin + (local % columns) * (tw + spacing);
  const sy = margin + Math.floor(local / columns) * (th + spacing);
  return { left: sx, top: sy, width: tw, height: th };
}

// -------------------- main --------------------
async function main() {
  // read map.json
  const raw = fs.readFileSync(inputPath, "utf8");
  const map = JSON.parse(raw);

  // --- 1) RLE compress first tile layer (extend if you add more layers later)
  let compressedBase64 = "";
  for (const layer of map.layers) {
    if (layer.type === "tilelayer" && Array.isArray(layer.data)) {
      const rleData = compressLayerData(layer.data);
      const u8 = Uint8Array.from(rleData);
      compressedBase64 = encodeBase64RLE(u8);
      layer.data = compressedBase64;
      layer.encoding = "base64-rle";
      break; // only first tile layer for now
    }
  }

  // Persist RLE'd map json (debug/reference)
  fs.writeFileSync(outputJsonPath, JSON.stringify(map));
  // Write level1.ts payload
  fs.mkdirSync(path.dirname(outputTsPath), { recursive: true });
  fs.writeFileSync(
    outputTsPath,
`export const LEVEL_1_BASE64 = "${compressedBase64}";
export const LEVEL_1_WIDTH = ${map.width};
export const LEVEL_1_HEIGHT = ${map.height};
`
  );

  // --- 2) Collect used GIDs (>0) from the original (non-RLE) data
  const original = JSON.parse(raw);
  const layer0 = original.layers.find(l => l.type === "tilelayer" && Array.isArray(l.data));
  if (!layer0) throw new Error("No tilelayer with array data found in map.json");
  const usedSet = new Set(layer0.data.filter(n => n > 0));
  const used = [...usedSet].sort((a,b)=>a-b);

  // --- 3) Load TSX tileset
  if (!Array.isArray(original.tilesets) || original.tilesets.length === 0)
    throw new Error("map.json has no tilesets");
  if (original.tilesets.length !== 1) {
    console.warn("⚠ Multiple tilesets detected; this script currently handles one. Using the first.");
  }
  const tsRef = original.tilesets[0]; // { firstgid, source }
  const tsxPath = path.resolve(path.dirname(inputPath), tsRef.source);
  const tsxText = fs.readFileSync(tsxPath, "utf8");
  const { tilewidth: TW, tileheight: TH, columns: COLS, spacing: SP=0, margin: MG=0, imageSrc } = parseTsxAttrs(tsxText);
  if (!TW || !TH || !COLS || !imageSrc) throw new Error("Failed to parse TSX (tilewidth/height/columns/image missing)");
  const firstgid = tsRef.firstgid || 1;
  const imgPath = path.resolve(path.dirname(tsxPath), imageSrc);

  // --- 4) Compose packed strip image of only used tiles
  const perRow = used.length || 1;
  const outW = perRow * TW, outH = TH;
  const base = sharp({ create: { width: outW, height: outH, channels: 4, background: { r:0, g:0, b:0, alpha:0 } } });

  const composites = await Promise.all(
    used.map(async (gid, i) => {
      const r = cropRectForGid(gid, firstgid, COLS, TW, TH, SP, MG);
      const tile = await sharp(imgPath).extract(r).toBuffer();
      return { input: tile, left: i * TW, top: 0 };
    })
  );

  await base.composite(composites).png().toFile(outPackedPng);

  // --- 5) Write tileAtlas.ts mapping -> new packed coords
  let atlasTs = `// src/atlas/tileAtlas.ts\n// Auto-generated by scripts/compress-map.js (tiles are ${TW}x${TH})\nexport const tileAtlasMeta = {\n`;
  used.forEach((gid, i) => {
    const x = i * TW;
    atlasTs += `  ${gid}: { x: ${x}, y: 0, w: ${TW}, h: ${TH} },\n`;
  });
  atlasTs += `} as const;\n`;
  fs.writeFileSync(outTileAtlasTs, atlasTs);

  // --- logs
  console.log(`✔ RLE-compressed JSON written to: ${outputJsonPath}`);
  console.log(`✔ LEVEL_1_BASE64 written to:     ${outputTsPath}`);
  console.log(`✔ Packed tiles PNG:              ${outPackedPng} (${used.length} tiles)`);
  console.log(`✔ tileAtlas.ts written:          ${outTileAtlasTs}`);
  console.log(`ℹ Remember to compress ${outPackedPng} manually as needed for production into src/assets/img/map-packed-min.png.`);
  console.log(`ℹ Remember to embed ${outPackedPng} in tools/embed-image.js as the 'map' image.`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
