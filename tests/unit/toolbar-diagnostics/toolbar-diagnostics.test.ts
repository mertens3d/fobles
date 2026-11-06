import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { Window } from "happy-dom";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { ActivityListener } from "../../../src/content/shared/activity/activity.types.ts";
import type { WorkerPoolStatus } from "../../../src/content/foundation/workers/pool/worker-pool-status.types.ts";
import type { StructuralSettings } from "../../../src/shared/structural/structural.types.ts";
import type { ToolbarDiagnosticsServices } from "../../../src/content/toolbar/diagnostics/toolbar-diagnostics.types.ts";

const require = createRequire(import.meta.url);
const bundled = await build({
  stdin: {
    contents: `export { ToolbarDiagnostics } from "./src/content/toolbar/diagnostics/toolbar-diagnostics.tsx";
      export { normalizeStructuralSettings } from "./src/shared/structural/structural-settings.ts";`,
    resolveDir: fileURLToPath(new URL("../../../", import.meta.url)),
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  jsx: "automatic",
  plugins: [{
    name: "diagnostic-test-dependencies",
    setup(builder) {
      builder.onResolve({ filter: /^react(?:\/.*)?$/ }, (args) => ({
        path: pathToFileURL(require.resolve(args.path)).href, external: true,
      }));
      builder.onResolve({ filter: /worker-pool-client$/ }, () => ({ path: "client", namespace: "diagnostic-test" }));
      builder.onLoad({ filter: /./, namespace: "diagnostic-test" }, () => ({
        contents: "export async function getWorkerPoolStatus() { return undefined; }",
      }));
    },
  }],
});
const { ToolbarDiagnostics, normalizeStructuralSettings } = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`
) as typeof import("../../../src/content/toolbar/diagnostics/toolbar-diagnostics.tsx") &
  typeof import("../../../src/shared/structural/structural-settings.ts");

function poolStatus(): WorkerPoolStatus {
  return {
    hostTabId: 101, activeBackground: 1, activeForeground: 0, activeTasks: [{
      requestId: "structural", taskId: "bases", type: "get-template-bases", url: "https://sitecore.example/editor",
      workClass: "background", phase: "executing", item: { kind: "id", value: "template-guid" },
    }],
    capacity: 2, maxBackgroundActive: 1, maxWorkers: 3, queuedBackground: 2, queuedForeground: 1,
    queuedTasks: [], workerCount: 1,
  };
}

async function update(action: () => void): Promise<void> {
  await act(async () => {
    action();
    await Promise.resolve();
  });
}

void test("toolbar diagnostics render default off, toggle live, reuse progress and isolate host status", async () => {
  const win = new Window();
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "window", { configurable: true, value: win });
  Object.defineProperty(globalThis, "document", { configurable: true, value: win.document });
  const environment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
  environment.IS_REACT_ACT_ENVIRONMENT = true;
  const container = win.document.createElement("div");
  const root = createRoot(container as unknown as HTMLElement);
  let settingsListener: ((settings: StructuralSettings) => void) | undefined;
  let activityListener: ActivityListener | undefined;
  let reads = 0;
  let unsubscriptions = 0;
  const defaults = normalizeStructuralSettings(undefined);
  const services: ToolbarDiagnosticsServices = {
    getSettings: () => Promise.resolve(defaults),
    getStatus: () => {
      reads++;
      return Promise.resolve(poolStatus());
    },
    subscribe: (listener) => {
      activityListener = listener;
      return () => {
        activityListener = undefined;
        unsubscriptions++;
      };
    },
    watchSettings: (listener) => {
      settingsListener = listener;
      return () => {
        settingsListener = undefined;
      };
    },
  };
  function emit(status: WorkerPoolStatus): void {
    activityListener?.({
      activityId: "pool", kind: "worker-pool-status", label: "Pool", source: "worker-pool",
      state: "completed", timestamp: 0, poolStatus: status,
    });
  }
  try {
    assert.equal(defaults.showToolbarDiagnostics, false);
    assert.equal(normalizeStructuralSettings({ showToolbarDiagnostics: "true" }).showToolbarDiagnostics, false);
    await update(() => {
      root.render(createElement(ToolbarDiagnostics, { services }));
    });
    assert.equal(container.innerHTML, "");
    assert.equal(reads, 0);
    assert.equal(activityListener, undefined);

    await update(() => {
      settingsListener?.({ ...defaults, showToolbarDiagnostics: true });
    });
    assert.equal(reads, 1);
    assert.match(container.textContent, /Active 1\/3 · Capacity 2 · FG 0 active\/1 queued · BG 1 active\/2 queued/);
    assert.match(container.textContent, /Reading Direct Base Templates · template-guid · executing/);
    assert.ok(container.querySelector(".fobles-reference-graph-enrichment-progress"));
    assert.equal(container.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow"), "1");
    assert.equal(container.querySelector("dialog"), null);

    await update(() => {
      emit({ ...poolStatus(), hostTabId: 999, activeBackground: 9 });
    });
    assert.match(container.textContent, /Active 1\/3/);
    await update(() => {
      emit({ ...poolStatus(), hostTabId: undefined, activeBackground: 9 });
    });
    assert.match(container.textContent, /Active 1\/3/);
    await update(() => {
      emit({ ...poolStatus(), requestId: "other-request", activeBackground: 9 });
    });
    assert.match(container.textContent, /Active 1\/3/);
    await update(() => {
      emit({ ...poolStatus(), activeForeground: 1, capacity: 1,
        activeTasks: [...poolStatus().activeTasks, {
          requestId: "graph", taskId: "quick", type: "get-quick-info", url: "https://sitecore.example/editor",
          workClass: "foreground", phase: "starting", item: { kind: "path", value: "/sitecore/content/Home" },
        }],
      });
    });
    assert.match(container.textContent, /Active 2\/3 · Capacity 1/);
    assert.match(container.textContent, /Reading Quick Info · \/sitecore\/content\/Home · starting/);
    await update(() => {
      activityListener?.({ activityId: "quick", requestId: "other", kind: "get-quick-info", label: "Other",
        source: "worker", state: "started", timestamp: 1, detail: "wrong-host-detail" });
    });
    assert.doesNotMatch(container.textContent, /wrong-host-detail/);
    await update(() => {
      emit({ ...poolStatus(), activeBackground: 0, activeTasks: [], queuedTasks: [], queuedBackground: 0 });
    });
    assert.match(container.textContent, /Idle/);
    assert.doesNotMatch(container.textContent, /template-guid/);
    const lateListener = activityListener as ActivityListener | undefined;
    await update(() => {
      settingsListener?.({ ...defaults, showToolbarDiagnostics: false });
    });
    assert.equal(container.innerHTML, "");
    assert.equal(activityListener, undefined);
    assert.equal(unsubscriptions, 1);
    await update(() => {
      lateListener?.({ activityId: "pool", kind: "pool", label: "Pool", source: "worker-pool",
        state: "completed", timestamp: 2, poolStatus: poolStatus() });
    });
    assert.equal(container.innerHTML, "");
    await update(() => {
      settingsListener?.({ ...defaults, showToolbarDiagnostics: true });
    });
    assert.equal(reads, 2);
    assert.match(container.textContent, /Reading Direct Base Templates/);
  } finally {
    await update(() => {
      root.unmount();
    });
    assert.equal(settingsListener, undefined);
    assert.equal(activityListener, undefined);
    if (previousWindow) {
      Object.defineProperty(globalThis, "window", previousWindow);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
    if (previousDocument) {
      Object.defineProperty(globalThis, "document", previousDocument);
    } else {
      Reflect.deleteProperty(globalThis, "document");
    }
    delete environment.IS_REACT_ACT_ENVIRONMENT;
    await win.happyDOM.close();
  }
});