import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

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

async function bundle(entryPoint, outfile, format) {
  await esbuild.build({
    entryPoints: [join(projectRoot, entryPoint)],
    outfile: join(projectRoot, outfile),
    bundle: true,
    platform: "browser",
    format,
  });
}

// Bundling via esbuild's JS API instead of spawning node_modules/esbuild/bin/esbuild directly -
// on some CI environments that bin file ends up as the platform's raw native binary rather than
// the JS CLI shim, which crashes Node trying to parse it as a script. The JS API resolves the real
// native binary from the platform-specific @esbuild/<platform> package itself instead.
await bundle("src/content/index.ts", "dist/unpacked/content.js", "iife");
await bundle("src/background/index.ts", "dist/unpacked/background.js", "esm");
await bundle("src/options/index.ts", "dist/unpacked/options.js", "iife");
await bundle("src/popup/index.ts", "dist/unpacked/popup.js", "iife");

run(process.execPath, [
  join(projectRoot, "tools/scripts/build/add-generated-banner.js"),
]);

console.log("Extension build complete.");
