// rollup.config.js

import typescript from "@rollup/plugin-typescript";
import { terser } from "rollup-plugin-terser";
import { visualizer } from "rollup-plugin-visualizer";
import glsl from "rollup-plugin-glsl";
import fs from "fs";
import path from "path";

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
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
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
    file: "dist/tmp.js", // output before Roadroller
    format: "iife"
  },
  plugins: [
    glsl({
      include: ["**/*.glsl"],
      compress: true
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

    copyPublicFolder()
  ]
};