// rollup.config.js

import typescript from "@rollup/plugin-typescript";
import { terser } from "rollup-plugin-terser";
import { visualizer } from "rollup-plugin-visualizer";
import glsl from "rollup-plugin-glsl"; // <-- ADDED
import fs from "fs";
import path from "path";

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

/**
 * Plugin to copy static assets from public/ to dist/
 */
function copyPublicFolder() {
  return {
    name: "copy-public-folder",
    buildStart() {
      const srcDir = path.resolve("public");
      const destDir = path.resolve("dist");

      if (!fs.existsSync(srcDir)) return;

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      for (const file of fs.readdirSync(srcDir)) {
        const srcFile = path.join(srcDir, file);
        const destFile = path.join(destDir, file);
        fs.copyFileSync(srcFile, destFile);
      }
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
    // 🔧 Shader compression
    glsl({
      include: ["**/*.glsl"], // Only .glsl files
      compress: true          // Minify GLSL code
    }),

    typescript({
      target: "ESNext",
      module: "ESNext",
      noEmitHelpers: true,
      importHelpers: false
    }),

    terser({
      compress: {
        passes: 22,
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

    visualizer({
      filename: "dist/stats.html",
      title: "Bundle Visualizer",
      sourcemap: false,
      template: "treemap"
    }),

    copyPublicFolder(),

    inlineIntoHTML({
      jsFile: "dist/tmp.js",
      htmlTemplate: "src/template.html",
      outputFile: "dist/index.html"
    })
  ]
};
