// tools/embed-image.js
import fs from "fs";

const imagePaths = [
  { name: "packed", file: "src/assets/packed/animations/texture.png" }
];

// Share the long prefix so packers model it once
let out = `// Auto-generated: embedded PNGs as base64\nexport const P="data:image/png;base64,";\n`;

for (const { name, file } of imagePaths) {
  const bin = fs.readFileSync(file);
  const base64 = bin.toString("base64");
  out += `export const ${name}Base64=P+"${base64}";\n`;
}

fs.writeFileSync("src/assets/img/embedded.ts", out);
console.log("✔ Embedded base64 images generated.");
