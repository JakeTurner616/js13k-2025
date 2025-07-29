import fs from "fs";
import path from "path";

const inputPath = process.argv[2];

if (!inputPath) {
  console.error("❌ Usage: node scripts/encode-png.js path/to/image.png");
  process.exit(1);
}

const resolvedPath = path.resolve(inputPath);
const baseName = path.basename(resolvedPath, path.extname(resolvedPath));
const dirName = path.dirname(resolvedPath);
const outPath = path.join(dirName, `${baseName}.b64`);

try {
  const data = fs.readFileSync(resolvedPath);
  const base64 = data.toString("base64");
  fs.writeFileSync(outPath, `data:image/png;base64,${base64}`);
  console.log(`✅ Encoded ${resolvedPath} → ${outPath}`);
} catch (e) {
  console.error(`❌ Failed to read or write file: ${e.message}`);
  process.exit(1);
}
