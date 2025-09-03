// scripts/map-order.js

//Can be adjusted to rearrange levels in a more friendly order so we as the developer can work on whatver level we want then order them later if needed!
// Makes map7 the 2nd level by renaming JSON files:
//   map7 -> map2
//   map2 -> map3
//   map3 -> map4
//   map4 -> map5
//   map5 -> map6
//   map6 -> map7
//
// Safe 2-phase rename to avoid collisions. Only touches plain .json (not .rle/.compressed).

import fs from "node:fs/promises";
import path from "node:path";

async function exists(p){ try{ await fs.access(p); return true; } catch { return false; } }
const j = (...p) => path.join(...p);

async function main(){
  const args = process.argv.slice(2);
  const APPLY  = args.includes("--apply");
  const dirArg = args.find(a => !a.startsWith("-"));
  const mapDir = dirArg ? path.resolve(dirArg) : j(process.cwd(), "src", "maps");

  const plan = [
    ["map7.json","map2.json"],
    ["map2.json","map3.json"],
    ["map3.json","map4.json"],
    ["map4.json","map5.json"],
    ["map5.json","map6.json"],
    ["map6.json","map7.json"],
  ];

  console.log(`Maps dir: ${mapDir}`);
  console.log("Planned renames:"); for(const [f,t] of plan) console.log(`  ${f}  ->  ${t}`);

  const missing=[]; for(const [f] of plan) if(!(await exists(j(mapDir,f)))) missing.push(f);
  if(missing.length){
    console.error("\nERROR: Missing expected input file(s):"); missing.forEach(m=>console.error("  -",m));
    console.error("\nAborting. Provide the correct folder or adjust the plan."); process.exit(1);
  }

  if(!APPLY){
    console.log('\nDry run complete. Add --apply to perform the rename.');
    console.log('Examples:\n  node scripts/map-order.js --apply\n  node scripts/map-order.js "C:\\Users\\jaked\\Documents\\ts-es-small\\repo-fix\\src\\maps" --apply');
    return;
  }

  const stamp=Date.now(); const temps=new Map();
  try{
    // phase 1 → temp
    for(const [f] of plan){ const src=j(mapDir,f), tmp=j(mapDir,`${f}.moving.${stamp}`); await fs.rename(src,tmp); temps.set(f,tmp); }
    // phase 2 → final
    for(const [f,t] of plan){ const tmp=temps.get(f), dst=j(mapDir,t); await fs.rename(tmp,dst); console.log(`RENAMED: ${f} -> ${t}`); }
    console.log("\nDone. New order: map, map2(←old map7), map3(←old map2), …, map7(←old map6).");
  }catch(err){
    console.error("Rename failed:",err); console.error("Attempting rollback…");
    for(const [f,tmp] of temps){ try{ const orig=j(mapDir,f); if(await exists(tmp) && !(await exists(orig))) await fs.rename(tmp,orig); }catch{} }
    process.exit(1);
  }
}

main().catch(e=>{ console.error(e); process.exit(1); });
