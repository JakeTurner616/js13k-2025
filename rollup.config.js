import typescript from "@rollup/plugin-typescript";
import { terser } from "rollup-plugin-terser";
import fs from "fs";

/**
 * Custom plugin to inline minified JS directly into HTML using raw string for eval
 */
function inlineIntoHTML({ jsFile, htmlTemplate, outputFile }) {
  return {
    name: "inline-into-html",
    writeBundle() {
      let js = fs.readFileSync(jsFile, "utf8");
      // Escape single quotes and remove newlines for a safe and compact eval
      js = js.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "");

      const html = fs.readFileSync(htmlTemplate, "utf8");
      const inlined = `<script>eval('${js}')</script>`;
      fs.writeFileSync(outputFile, html.replace("</body>", `${inlined}</body>`));
      fs.unlinkSync(jsFile);
    }
  };
}

export default {
  input: "src/main.ts",
  output: {
    file: "dist/tmp.js",
    format: "iife"
  },
  plugins: [
    typescript({
      target: "ESNext",
      module: "ESNext",
      noEmitHelpers: true,
      importHelpers: false
    }),
    terser({
      compress: {
        passes: 3,
        unsafe: true,
        unsafe_math: true,
        unsafe_comps: true,
        unsafe_undefined: true,
        collapse_vars: true,
        reduce_funcs: true,
        reduce_vars: true,
        drop_console: true,
        drop_debugger: true,
        toplevel: true
      },
      mangle: {
        toplevel: true
      },
      format: {
        comments: false,
        ascii_only: true
      }
    }),
    inlineIntoHTML({
      jsFile: "dist/tmp.js",
      htmlTemplate: "src/template.html",
      outputFile: "dist/index.html"
    })
  ]
};
