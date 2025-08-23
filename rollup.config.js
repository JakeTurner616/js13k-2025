// rollup.config.js
import typescript from "@rollup/plugin-typescript";
import { terser } from "rollup-plugin-terser";
import glsl from "rollup-plugin-glsl";
import fs from "fs";
import path from "path";

function copyPublicFolder() {
  return {
    name: "copy-public-folder",
    buildStart() {
      const src = path.resolve("public");
      const dst = path.resolve("dist");
      if (!fs.existsSync(src)) return;
      if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
      for (const f of fs.readdirSync(src)) {
        fs.copyFileSync(path.join(src, f), path.join(dst, f));
      }
    }
  };
}

export default {
  input: "src/main.ts",
  inlineDynamicImports: true,
  output: {
    file: "dist/tmp.js",
    format: "iife",
    compact: true,
    esModule: false,
    generatedCode: { constBindings: true, arrowFunctions: true },
    minifyInternalExports: true,
    preferConst: true
  },
  treeshake: {
    annotations: true,
    moduleSideEffects: false,
    propertyReadSideEffects: false,
    tryCatchDeoptimization: false,
    unknownGlobalSideEffects: false
  },
  onwarn(w, warn) {
    if (w.code === "THIS_IS_UNDEFINED") return;
    warn(w);
  },
  plugins: [
    glsl({ include: ["**/*.glsl"], compress: true }),
    typescript({
      target: "ES2020",
      module: "ESNext",
      importHelpers: false,
      noEmitHelpers: true,
      sourceMap: false,
      inlineSources: false,
      include: ["src/**/*.ts"],
      removeComments: true
    }),
    terser({
      ecma: 2020,
      module: true,
      compress: {
        passes: 3,
        drop_console: true,
        drop_debugger: true,
        toplevel: true,
        global_defs: {
          "process.env.NODE_ENV": "production",
          __DEV__: false,
          DEBUG: false
        },
        unsafe: true,
        unsafe_arrows: true,
        unsafe_comps: true,
        unsafe_Function: true,
        unsafe_math: true,
        unsafe_methods: true,
        unsafe_proto: true,
        unsafe_regexp: true,
        pure_getters: true,
        side_effects: true,
        evaluate: true,
        loops: true,
        conditionals: true,
        booleans: true,
        comparisons: true,
        sequences: true,
        if_return: true,
        inline: 3,
        reduce_funcs: true,
        reduce_vars: true,
        collapse_vars: true,
        hoist_funs: true,
        hoist_props: true
      },
      mangle: { toplevel: true, properties: { regex: /^_/ } },
      format: { comments: false, ascii_only: true }
    }),
    copyPublicFolder()
  ]
};
