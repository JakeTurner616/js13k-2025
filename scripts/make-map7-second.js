// scripts/make-map7-second.js

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

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

function join(dir, name) { return path.join(dir, name); }

async function main() {
  const mapDir = process.argv[2] || path.join(process.cwd(), "src", "maps");
  const APPLY = process.argv.includes("--apply");

  const plan = [
    ["map7.json", "map2.json"],
    ["map2.json", "map3.json"],
    ["map3.json", "map4.json"],
    ["map4.json", "map5.json"],
    ["map5.json", "map6.json"],
    ["map6.json", "map7.json"],
  ];

  console.log(`Maps dir: ${mapDir}`);
  console.log("Planned renames:");
  for (const [from, to] of plan) console.log(`  ${from}  ->  ${to}`);

  // Verify presence of all "from" files (we only operate on these)
  const missing = [];
  for (const [from] of plan) {
    if (!(await exists(join(mapDir, from)))) missing.push(from);
  }
  if (missing.length) {
    console.error("\nERROR: Missing expected input file(s):");
    for (const m of missing) console.error("  -", m);
    console.error("\nAborting. Place the files or adjust the script/plan.");
    process.exit(1);
  }

  if (!APPLY) {
    console.log('\nDry run complete. Add --apply to perform the rename.');
    console.log('Example:\n  node scripts/make-map7-second.js "C:\\Users\\jaked\\Documents\\ts-es-small\\repo-fix\\src\\maps" --apply');
    return;
  }

  // Phase 1: move all sources to unique temp names
  const stamp = Date.now();
  const temps = new Map(); // from -> tempPath
  try {
    for (const [from] of plan) {
      const src = join(mapDir, from);
      const tmp = join(mapDir, `${from}.moving.${stamp}`);
      await fs.rename(src, tmp);
      temps.set(from, tmp);
    }

    // Phase 2: move temps into final targets
    for (const [from, to] of plan) {
      const tmp = temps.get(from);
      const dst = join(mapDir, to);
      await fs.rename(tmp, dst);
      console.log(`RENAMED: ${from} -> ${to}`);
    }

    console.log("\nDone. New order in plain JSON is now: map, map2(=old map7), map3(=old map2), …, map7(=old map6).");
  } catch (err) {
    console.error("Rename failed:", err);
    // Best-effort rollback
    console.error("Attempting rollback…");
    for (const [from, tmp] of temps) {
      try {
        const original = join(mapDir, from);
        if (await exists(tmp) && !(await exists(original))) {
          await fs.rename(tmp, original);
          console.log(`Rolled back: ${from}`);
        }
      } catch {}
    }
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
