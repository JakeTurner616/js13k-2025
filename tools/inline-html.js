// tools/inline-html.js
import fs from "fs/promises";

const [html, js] = await Promise.all([
  fs.readFile("src/template.html", "utf8"),
  fs.readFile("dist/packed.js", "utf8") // Roadroller output
]);

// Inject Roadroller's two-line decoder RAW (no escaping, no extra eval)
const result = html.replace("</body>", `<script>\n${js}\n</script></body>`);

// Write final self-contained HTML
await fs.writeFile("dist/index.html", result);

// Cleanup intermediate files
await Promise.allSettled([
  fs.unlink("dist/packed.js"),
  fs.unlink("dist/tmp.js")
]);

console.log("✔ Inlined Roadroller JS into index.html and cleaned up dist/");
