// tools/compress.js
import fs from "fs/promises";
import { Packer } from "roadroller";

const input = await fs.readFile("dist/tmp.js", "utf8");

// Keep action "eval" so Roadroller emits its tuned two-line decoder
const packer = new Packer([{ data: input, type: "js", action: "eval" }], {
  asmJs: true
});

await packer.optimize();

const { firstLine, secondLine } = packer.makeDecoder();
const code = `${firstLine}${secondLine}`;

console.log("Original size:", input.length);
console.log("Roadrolled size:", code.length);

await fs.writeFile("dist/packed.js", code);
