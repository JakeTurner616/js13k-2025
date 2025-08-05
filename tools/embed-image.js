// tools/embed-image.js
import fs from "fs";
import path from "path";

const imagePaths = [
  { name: "packed", file: "src/assets/img/packed.png" },
  { name: "map", file: "src/assets/img/map.png" }
];

let out = `// Auto-generated: embedded PNGs as base64\n`;

for (const { name, file } of imagePaths) {
  const bin = fs.readFileSync(file);
  const base64 = bin.toString("base64");
  out += `export const ${name}Base64 = "data:image/png;base64,${base64}";\n`;
}

fs.writeFileSync("src/assets/img/embedded.ts", out);
console.log("✔ Embedded base64 images generated.");
