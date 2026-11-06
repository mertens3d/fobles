import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import type { SessionTestEnvironment } from "./work-session-harness.types.ts";

const ENVIRONMENT_KEY = "__foblesWorkSessionTestEnvironment";
let instance = 0;
let bundle: Promise<string> | undefined;

async function bundleSession(): Promise<string> {
  const mocks: Record<string, string> = {
    "const": `export const CONST = {FOBLES: {WORKER_POOL: {
      WORKER_IFRAME_SELECTOR: "iframe", POOL_DISPOSAL_TIMEOUT_MS: 1000, POOL_DISPOSAL_PROGRESS_INTERVAL_MS: 10
    }}};`,
    "error-dialog": "export function showFoblesErrorDialog() {} export function updateFoblesCleanupDialog() {}",
    "logger": "export const extensionLog = {debug() {}, warn() {}, error() {}};",
    "runtime-settings": `export const getRuntimeSettings = () => ({workerPool: {
      specialistNoProgressMs: 20, healthPollIntervalMs: 10
    }});`,
    "worker-iframe-host": `export function emergencyCleanupWorkerIframes() {
      env.cleanupCount += 1;
      return {orphanCountBefore: 0, trackedCountBefore: 0, containerFound: false,
        orphanCountAfter: 0, trackedCountAfter: 0, containerExistsAfter: false};
    }`,
    "worker-pool-client": `export const runWorkerTask = async task => {
      env.tasks.push(task); return env.pending ?? {...task, status: "cancelled"};
    };
    export function cancelWorkerRequest(id) {env.cancelled.push(id)}
    export async function disposeBackgroundWorkerPool() {env.disposalCount += 1}`,
  };
  const result = await build({
    stdin: {
      contents: `export * from "./work-session.ts";`,
      resolveDir: fileURLToPath(new URL("../../../src/content/shell/work-session/", import.meta.url)),
    },
    bundle: true, write: false, platform: "node", format: "esm",
    plugins: [{
      name: "work-session-test-dependencies",
      setup(builder) {
        builder.onResolve({ filter: /./ }, (args) => {
          const name = args.path.substring(args.path.lastIndexOf("/") + 1).replace(/\.ts$/, "");
          return name && mocks[name] ? { path: name, namespace: "session-test" } : undefined;
        });
        builder.onLoad({ filter: /./, namespace: "session-test" }, (args) => ({
          contents: `const env = globalThis.${ENVIRONMENT_KEY};\n${mocks[args.path]}`,
        }));
      },
    }],
  });
  return result.outputFiles[0].text;
}

export async function createSessionHarness() {
  const env: SessionTestEnvironment = { cancelled: [], cleanupCount: 0, disposalCount: 0, tasks: [] };
  const globals = globalThis as unknown as Record<string, unknown>;
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { configurable: true, value: { querySelectorAll: () => [] } });
  globals[ENVIRONMENT_KEY] = env;
  bundle ??= bundleSession();
  const source = `${await bundle}\nexport const testInstance = ${++instance};`;
  const sessions = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`) as
    typeof import("../../../src/content/shell/work-session/work-session.ts");
  delete globals[ENVIRONMENT_KEY];
  return {
    env, sessions,
    restore: () => {
      if (originalDocument) {
        Object.defineProperty(globalThis, "document", originalDocument);
      } else {
        delete globals.document;
      }
    },
  };
}