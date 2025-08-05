// tools/inline-html.js
import fs from "fs/promises";

const [html, js] = await Promise.all([
  fs.readFile("src/template.html", "utf8"),
  fs.readFile("dist/packed.js", "utf8")
]);

const escaped = js.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "");
const result = html.replace("</body>", `<script>eval('${escaped}')</script></body>`);

// Write final self-contained HTML
await fs.writeFile("dist/index.html", result);

// Cleanup intermediate files
await Promise.allSettled([
  fs.unlink("dist/packed.js"),
  fs.unlink("dist/tmp.js")
]);

console.log("✔ Inlined JS into index.html and cleaned up dist/");
