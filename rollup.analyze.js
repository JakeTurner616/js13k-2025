// rollup.analyze.js
import typescript from "@rollup/plugin-typescript";
import glsl from "rollup-plugin-glsl";
import { visualizer } from "rollup-plugin-visualizer";

export default {
  input: "src/main.ts",
  inlineDynamicImports: true,
  output: {
    file: "dist/tmp.js",
    format: "iife",
    compact: false
  },
  plugins: [
    glsl({ include: ["**/*.glsl"], compress: true }),
    typescript({
      target: "ES2020",
      module: "ESNext",
      importHelpers: false,
      noEmitHelpers: true,
      sourceMap: false,
      include: ["src/**/*.ts"]
    }),
    visualizer({
      filename: "dist/stats.html",
      title: "JS13k Bundle Analysis",
      template: "treemap",
      gzipSize: true,
      brotliSize: true,
      sourcemap: false,
      emitFile: false,
      open: true
    })
  ]
};
