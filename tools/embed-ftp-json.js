// tools/embed-ftp-json.js
import fs from "fs";
import path from "path";

const SRC_JSON = path.resolve("src/assets/packed/animations/texture.json");
const OUT_TS   = path.resolve("src/assets/packed/animations/texture.ts");

const raw = fs.readFileSync(SRC_JSON, "utf8");
const obj = JSON.parse(raw);                 // validate
const min = JSON.stringify(obj);             // minify

const out = `// Auto-generated from texture.json — do not edit
const ftp = ${min} as const;
export default ftp;
`;
fs.mkdirSync(path.dirname(OUT_TS), { recursive: true });
fs.writeFileSync(OUT_TS, out);
console.log("✔ Emitted TS module:", OUT_TS);
