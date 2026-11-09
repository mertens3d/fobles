// @source-path [fobles] tools/scripts/build/build-common.js

import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
export const SASS_BUILDS = [
  { input: "src/content/styles/fobles-extension.scss", output: "dist/unpacked/fobles.css" },
  { input: "src/options/options.scss", output: "dist/unpacked/options.css" },
];
export const ESBUILD_BUILDS = [
  { entryPoint: "src/content/index.ts", outfile: "dist/unpacked/content.js", format: "iife" },
  { entryPoint: "src/background/index.ts", outfile: "dist/unpacked/background.js", format: "esm" },
  { entryPoint: "src/options/index.tsx", outfile: "dist/unpacked/options.js", format: "iife" },
  { entryPoint: "src/popup/index.tsx", outfile: "dist/unpacked/popup.js", format: "iife" },
];
export function run(command, args) {
  const result = spawnSync(command, args, { cwd: projectRoot, stdio: "inherit", shell: false });
  if (result.error) { console.error(result.error); process.exit(1); }
  if (result.status !== 0) { process.exit(result.status ?? 1); }
}
export function runNodeScript(relativePath) { run(process.execPath, [join(projectRoot, relativePath)]); }
export function sassArgs(build, watch = false) {
  const args = ["node_modules/sass/sass.js", build.input, build.output];
  if (watch) { args.push("--watch"); }
  args.push("--no-source-map");
  return args;
}
export function esbuildOptions(build, plugins = []) { return { entryPoints: [join(projectRoot, build.entryPoint)], outfile: join(projectRoot, build.outfile), bundle: true, platform: "browser", format: build.format, plugins }; }
export function runBoundaryCheck() { runNodeScript("tools/scripts/dev/check-boundaries.mjs"); }
export function applyGeneratedBanner() { runNodeScript("tools/scripts/build/add-generated-banner.js"); }
