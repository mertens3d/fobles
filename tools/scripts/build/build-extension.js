import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("Building extension...");

run(process.execPath, [join(projectRoot, "tools/scripts/dev/check-node-version.js")]);
run(process.execPath, [join(projectRoot, "tools/scripts/build/write-build-info.js")]);
run(process.execPath, [
  "node_modules/sass/sass.js",
  "src/content/styles/fobles-extension.scss",
  "dist/unpacked/fobles.css",
  "--no-source-map",
]);
run(process.execPath, [
  "node_modules/typescript/bin/tsc",
  "--noEmit",
  "-p",
  "tsconfig.json",
]);
run(process.execPath, [
  "node_modules/esbuild/bin/esbuild",
  "src/content/index.ts",
  "--bundle",
  "--platform=browser",
  "--format=iife",
  "--outfile=dist/unpacked/content.js",
]);
run(process.execPath, [
  "node_modules/esbuild/bin/esbuild",
  "src/background/index.ts",
  "--bundle",
  "--platform=browser",
  "--format=esm",
  "--outfile=dist/unpacked/background.js",
]);
run(process.execPath, [
  "node_modules/esbuild/bin/esbuild",
  "src/options/index.ts",
  "--bundle",
  "--platform=browser",
  "--format=iife",
  "--outfile=dist/unpacked/options.js",
]);
run(process.execPath, [
  "node_modules/esbuild/bin/esbuild",
  "src/popup/index.ts",
  "--bundle",
  "--platform=browser",
  "--format=iife",
  "--outfile=dist/unpacked/popup.js",
]);
run(process.execPath, [
  join(projectRoot, "tools/scripts/build/add-generated-banner.js"),
]);

console.log("Extension build complete.");
