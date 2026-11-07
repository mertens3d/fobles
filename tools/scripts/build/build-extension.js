// @source-path [fobles] tools/scripts/build/build-extension.js

import * as esbuild from "esbuild";
import { ESBUILD_BUILDS, SASS_BUILDS, esbuildOptions, run, runNodeScript, sassArgs } from "./build-common.js";

function compileSass() {
  for (const build of SASS_BUILDS) {
    run(process.execPath, sassArgs(build));
  }
}

function typecheck() {
  run(process.execPath, [
    "node_modules/typescript/bin/tsc",
    "--noEmit",
    "-p",
    "tsconfig.json",
  ]);
}

async function bundleExtension() {
  await Promise.all(ESBUILD_BUILDS.map((build) => esbuild.build(esbuildOptions(build))));
}

async function buildExtension() {
  console.log("Building extension...");

  runNodeScript("tools/scripts/dev/check-node-version.js");
  runNodeScript("tools/scripts/build/write-build-info.js");

  compileSass();
  typecheck();
  runNodeScript("tools/scripts/dev/check-boundaries.mjs");

  await bundleExtension();

  runNodeScript("tools/scripts/build/add-generated-banner.js");

  console.log("Extension build complete.");
}

await buildExtension();
