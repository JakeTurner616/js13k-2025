// rollup.config.js
import typescript from "@rollup/plugin-typescript";
import { terser } from "rollup-plugin-terser";
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
    moduleSideEffects: true,
    propertyReadSideEffects: false,
    tryCatchDeoptimization: false,
    unknownGlobalSideEffects: false
  },
  onwarn(w, warn) {
    if (w.code === "THIS_IS_UNDEFINED") return;
    warn(w);
  },
  plugins: [
    
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
  safari10: false,
  compress: {
    ecma: 2020,
    module: true,
    toplevel: true,
    passes: 6,
    drop_console: true,
    drop_debugger: true,
    pure_getters: true,
    // aggressive but safe for this codebase
    unsafe: true,
    unsafe_arrows: true,
    unsafe_comps: true,
    unsafe_Function: true,
    unsafe_math: true,
    unsafe_methods: true,
    unsafe_proto: true,
    unsafe_regexp: true,
    unsafe_undefined: true,
    // size wins
    collapse_vars: true,
    reduce_funcs: true,
    reduce_vars: true,
    hoist_funs: true,
    hoist_vars: true,
    hoist_props: true,
    computed_props: true,
    arguments: true,
    conditionals: true,
    comparisons: true,
    booleans: true,
    booleans_as_integers: true,
    sequences: true,
    if_return: true,
    inline: 3,
    dead_code: true,
    evaluate: true,
    loops: true,
    side_effects: true,
    switches: true,
    typeofs: true,
    directives: true
  },
  mangle: {
    toplevel: true,
    properties: {
      regex: /^_/,
      keep_quoted: true
    }
  },
  format: {
    comments: false,
    ascii_only: true,
    semicolons: false
  }
})
,
    copyPublicFolder()
  ]
};
