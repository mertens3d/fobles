import assert from "node:assert/strict";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import type { Deferred, PoolTestEnvironment } from "./worker-pool-harness.types.ts";
import type { WorkerTarget } from "../../../src/content/foundation/workers/pool/worker-target.ts";
import type { WorkerTask, WorkerTaskExecutionResult } from "../../../src/content/foundation/workers/tasks/worker-task.types.ts";

const ENVIRONMENT_KEY = "__foblesWorkerPoolTestEnvironment";
const MAX_MICROTASK_TURNS = 500;
let instance = 0;
let bundle: Promise<string> | undefined;

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((complete, fail) => {
    resolve = complete;
    reject = fail;
  });
  return { promise, resolve, reject };
}

async function bundlePool(): Promise<string> {
  const mocks: Record<string, string> = {
    "runtime-settings": `export const getRuntimeSettings = () => ({workerPool: {
      backgroundIntertaskCooldownMs: env.backgroundIntertaskCooldownMs,
        maxWorkers: env.maxWorkers, healthPollIntervalMs: 1000000, workerNoProgressMs: 1000000,
        poolNoProgressMs: 1000000, poolMaxWorkerRecoveries: 2, workerMaxRecoveriesPerJob: 2,
        taskTimeoutMs: 1000000
      }});`,
    "logger": "export const extensionLog = {debug() {}, warn() {}, error() {}};",
    "activity-events": "export function publishActivityToHost() {}",
    "worker-pool-settings": `export const getWorkerPoolMaxWorkers = async () => env.maxWorkers;
      export function onWorkerPoolMaxWorkersChange() {}`,
    "worker-protocol.const": "export const DEBUG_WORKER_POOL = false;",
    "worker-target-service": `export const createWorkerTarget = (host, url) => env.create(host, url);
      export const closeWorkerTarget = async target => {env.closed.push(target)};
      export const sendTaskToWorkerTarget = (target, task) => env.execute(target, task);
      export const navigateWorkerTarget = async target => target;
      export async function markWorkerTargetOwned() {}
      export function sendCancelToWorkerTarget() {}
      export const getWorkerTargetKey = target => target.kind === "tab" ? "tab:" + target.tabId : "iframe:" + target.workerId;`,
  };
  const result = await build({
    stdin: {
      contents: `export * from "./background-worker-pool.ts"; export * from "./worker-readiness.ts";`,
      resolveDir: fileURLToPath(new URL("../../../src/content/foundation/workers/pool/", import.meta.url)),
    },
    bundle: true,
    write: false,
    platform: "node",
    format: "esm",
    plugins: [{
      name: "worker-pool-test-dependencies",
      setup(builder) {
        builder.onResolve({ filter: /./ }, (args) => {
          const name = args.path.substring(args.path.lastIndexOf("/") + 1).replace(/\.ts$/, "");
          return name && mocks[name] ? { path: name, namespace: "pool-test" } : undefined;
        });
        builder.onLoad({ filter: /./, namespace: "pool-test" }, (args) => ({
          contents: `const env = globalThis.${ENVIRONMENT_KEY};\n${mocks[args.path]}`,
        }));
      },
    }],
  });
  return result.outputFiles[0].text;
}

export async function createPoolHarness(maxWorkers = 2, deferredCreation = false) {
  const env: PoolTestEnvironment = {
    creations: [], executions: [], closed: [], maxWorkers, deferredCreation, backgroundIntertaskCooldownMs: 0,
    create(hostTabId: number, url: string) {
      const ready = deferred<WorkerTarget>();
      env.creations.push({ hostTabId, url, ready });
      if (!env.deferredCreation) {
        ready.resolve({ kind: "iframe", hostTabId, workerId: `worker-${env.creations.length}`, frameId: env.creations.length });
      }
      return ready.promise;
    },
    execute(target: WorkerTarget, task: WorkerTask) {
      const result = deferred<WorkerTaskExecutionResult | undefined>();
      env.executions.push({ target, task, result });
      return result.promise;
    },
  };
  (globalThis as unknown as Record<string, unknown>)[ENVIRONMENT_KEY] = env;
  bundle ??= bundlePool();
  const source = `${await bundle}\nexport const testInstance = ${++instance};`;
  const pool = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`) as
    typeof import("../../../src/content/foundation/workers/pool/background-worker-pool.ts") &
    typeof import("../../../src/content/foundation/workers/pool/worker-readiness.ts");
  delete (globalThis as unknown as Record<string, unknown>)[ENVIRONMENT_KEY];
  return { pool, env };
}

export async function until(condition: () => boolean): Promise<void> {
  for (let turn = 0; turn < MAX_MICROTASK_TURNS && !condition(); turn += 1) {
    await Promise.resolve();
  }
  assert.ok(condition(), "Worker pool did not reach the expected state");
}

export async function cleanupPoolHarness(
  pool: typeof import("../../../src/content/foundation/workers/pool/background-worker-pool.ts"),
  env: PoolTestEnvironment,
): Promise<void> {
  env.creations.forEach((creation, index) => creation.ready.resolve({
    kind: "iframe", hostTabId: creation.hostTabId, workerId: `cleanup-${index}`, frameId: index + 1,
  }));
  env.executions.forEach((execution) => execution.result.resolve({ ...execution.task, status: "cancelled" }));
  await pool.disposeWorkerPool();
}