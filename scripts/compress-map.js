// scripts/compress-map.js
// Tiny dual-map preprocessor: RLE-compress first tile layer of map.json + map2.json
// → emits src/levels/{level1,level2}.ts and debug JSONs with baked RLE strings.
//
// Format: bytes = [value, run] pairs (run<=255), then base64.
// Runtime decoder expands to Uint32Array (see level-loader.ts).

import fs from "fs";
import path from "path";

// --- I/O table (add more rows for more levels) ---
const MAPS = [
  { in:"src/maps/map.json",  outJson:"src/maps/map.rle.json",  outTs:"src/levels/level1.ts", prefix:"LEVEL_1" },
  { in:"src/maps/map2.json", outJson:"src/maps/map2.rle.json", outTs:"src/levels/level2.ts", prefix:"LEVEL_2" },
  { in:"src/maps/map3.json", outJson:"src/maps/map3.rle.json", outTs:"src/levels/level3.ts", prefix:"LEVEL_3" },
  { in:"src/maps/map4.json", outJson:"src/maps/map4.rle.json", outTs:"src/levels/level4.ts", prefix:"LEVEL_4" },
  { in:"src/maps/map5.json", outJson:"src/maps/map5.rle.json", outTs:"src/levels/level5.ts", prefix:"LEVEL_5" },
  { in:"src/maps/map6.json", outJson:"src/maps/map6.rle.json", outTs:"src/levels/level6.ts", prefix:"LEVEL_6" },
  { in:"src/maps/map7.json", outJson:"src/maps/map7.rle.json", outTs:"src/levels/level7.ts", prefix:"LEVEL_7" },
  { in:"src/maps/map8.json", outJson:"src/maps/map8.rle.json", outTs:"src/levels/level8.ts", prefix:"LEVEL_8" },
];

// --- tiny helpers ---
const b64 = u8 => Buffer.from(u8).toString("base64");
function rle(data){ // compress [v,v,v,...] → [v,run,v,run,...]
  const out=[]; let i=0;
  while(i<data.length){
    const v=data[i]; let n=1;
    while(i+n<data.length && data[i+n]===v && n<255) n++;
    out.push(v,n); i+=n;
  }
  return out;
}

// compress one Tiled JSON: first tilelayer only
function processOne(cfg){
  const raw = fs.readFileSync(cfg.in, "utf8");
  const map = JSON.parse(raw);

  let base64="";
  for(const layer of map.layers){
    if(layer.type==="tilelayer" && Array.isArray(layer.data)){
      const u8 = Uint8Array.from(rle(layer.data));
      base64 = b64(u8);
      layer.data = base64;           // bake the RLE string for reference
      layer.encoding = "base64-rle"; // mark custom encoding
      break;
    }
  }

  // debug JSON (nice to inspect after baking)
  fs.mkdirSync(path.dirname(cfg.outJson), { recursive:true });
  fs.writeFileSync(cfg.outJson, JSON.stringify(map));

  // TS payload for runtime
  fs.mkdirSync(path.dirname(cfg.outTs), { recursive:true });
  fs.writeFileSync(
    cfg.outTs,
`export const ${cfg.prefix}_BASE64="${base64}";
export const ${cfg.prefix}_WIDTH=${map.width};
export const ${cfg.prefix}_HEIGHT=${map.height};
`
  );

  console.log(`✔ ${cfg.prefix} written → ${cfg.outTs}`);
  console.log(`✔ debug JSON → ${cfg.outJson}`);
}

// --- main ---
(async()=>{
  try{
    for(const cfg of MAPS) processOne(cfg);
  }catch(e){ console.error(e); process.exit(1); }
})();
