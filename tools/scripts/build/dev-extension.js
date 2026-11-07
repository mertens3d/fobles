// @source-path [fobles] tools/scripts/build/dev-extension.js

import { spawn } from "node:child_process";
import * as esbuild from "esbuild";
import { ESBUILD_BUILDS, SASS_BUILDS, esbuildOptions, projectRoot, runNodeScript, sassArgs } from "./build-common.js";

const children = [];
const contexts = [];
let buildInfoTimer;
let buildInfoWritePending = false;
const buildInfoTriggeredRebuilds = new Set();

function spawnProcess(command, args) {
  const child = spawn(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: false,
  });

  children.push(child);

  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`${command} exited with code ${code}`);
    }
  });

  return child;
}

function formatTime() {
  return new Date().toLocaleTimeString();
}

function updateBuildInfo() {
  if (buildInfoWritePending) {
    return;
  }

  buildInfoWritePending = true;
  clearTimeout(buildInfoTimer);

  buildInfoTimer = setTimeout(() => {
    buildInfoWritePending = false;
    for (const build of ESBUILD_BUILDS) {
      buildInfoTriggeredRebuilds.add(build.outfile);
    }

    runNodeScript("tools/scripts/build/write-build-info.js");

    console.log(`[${formatTime()}] Build timestamp updated`);
  }, 100);
}

function rebuildLogger(name) {
  return {
    name: `fobles-rebuild-${name}`,
    setup(build) {
      build.onStart(() => {
        console.log(`[${formatTime()}] ${name} rebuilding...`);
      });

      build.onEnd((result) => {
        const time = formatTime();

        if (result.errors.length > 0) {
          console.error(`[${time}] ${name} rebuild failed with ${result.errors.length} error(s)`);
        } else {
          console.log(`[${time}] ${name} rebuilt successfully`);

          if (buildInfoTriggeredRebuilds.has(name)) {
            buildInfoTriggeredRebuilds.delete(name);
          } else {
            updateBuildInfo();
          }
        }
      });
    },
  };
}

function watchTypeScript() {
  spawnProcess(process.execPath, [
    "node_modules/typescript/bin/tsc",
    "--noEmit",
    "--watch",
    "--preserveWatchOutput",
    "-p",
    "tsconfig.json",
  ]);
}

function watchSass() {
  for (const build of SASS_BUILDS) {
    spawnProcess(process.execPath, sassArgs(build, true));
  }
}

async function watchBundle(build) {
  const context = await esbuild.context(esbuildOptions(build, [rebuildLogger(build.outfile)]));

  contexts.push(context);
  await context.watch();
}

async function startWatchers() {
  console.log("Starting extension development watchers...");

  runNodeScript("tools/scripts/dev/check-node-version.js");
  runNodeScript("tools/scripts/build/write-build-info.js");

  watchTypeScript();
  watchSass();

  await Promise.all(ESBUILD_BUILDS.map(watchBundle));

  console.log("Extension development watchers ready.");
}

async function shutdown() {
  clearTimeout(buildInfoTimer);

  for (const child of children) {
    child.kill();
  }

  await Promise.all(contexts.map((context) => context.dispose()));
}

process.once("SIGINT", () => {
  void shutdown().finally(() => process.exit(0));
});

process.once("SIGTERM", () => {
  void shutdown().finally(() => process.exit(0));
});

await startWatchers();
