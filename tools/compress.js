// tools/compress.js
import fs from "fs/promises";
import { Packer } from "roadroller";

const input = await fs.readFile("dist/tmp.js", "utf8");

const packer = new Packer(
  [{ data: input, type: "js", action: "eval" }],
  { asmJs: true } // optional but good for JS13k
);

await packer.optimize();

const { firstLine, secondLine } = packer.makeDecoder();

const code = `${firstLine}${secondLine}`;

console.log("Original size:", input.length);
console.log("Roadrolled size:", code.length);

await fs.writeFile("dist/packed.js", code);
