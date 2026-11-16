import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { Window } from "happy-dom";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { ActivityEvent } from "../../../src/content/shared/activity/activity.types.ts";
import type { WorkProgressSnapshot } from "../../../src/content/foundation/workers/progress/work-progress.types.ts";
import type { StructuralSettings } from "../../../src/shared/structural/structural.types.ts";
import type { ToolbarDiagnosticsServices } from "../../../src/content/toolbar/diagnostics/toolbar-diagnostics.types.ts";

const require = createRequire(import.meta.url);
// Agent: One bundle, so the test drives the same progress registry and activity bus the toolbar subscribes to.
const bundled = await build({
  stdin: {
    contents: `export { ToolbarDiagnostics } from "./src/content/toolbar/diagnostics/toolbar-diagnostics.tsx";
      export { normalizeStructuralSettings } from "./src/shared/structural/structural-settings.ts";
      export { registerWorkProgress } from "./src/content/foundation/workers/progress/work-progress-registry.ts";
      export { pickRelevantWorkProgress, workProgressPercent } from "./src/content/foundation/workers/progress/work-progress-snapshot.ts";
      export { emitActivity } from "./src/content/shared/activity/activity-events.ts";`,
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
    },
  }],
});
const {
  ToolbarDiagnostics,
  emitActivity,
  normalizeStructuralSettings,
  pickRelevantWorkProgress,
  registerWorkProgress,
  workProgressPercent,
} = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`) as
  typeof import("../../../src/content/toolbar/diagnostics/toolbar-diagnostics.tsx") &
  typeof import("../../../src/shared/structural/structural-settings.ts") &
  typeof import("../../../src/content/foundation/workers/progress/work-progress-registry.ts") &
  typeof import("../../../src/content/foundation/workers/progress/work-progress-snapshot.ts") &
  typeof import("../../../src/content/shared/activity/activity-events.ts");

const BLANK_TASK = "\u00a0";

function snapshot(
  sessionId: string,
  status: WorkProgressSnapshot["status"],
  workClass: WorkProgressSnapshot["workClass"],
  startedAt: number,
): WorkProgressSnapshot {
  return { sessionId, label: sessionId, completed: 0, max: 0, startedAt, status, workClass };
}

function workerActivity(requestId: string, activityId: string, state: ActivityEvent["state"]): Omit<ActivityEvent, "timestamp"> {
  return { activityId, requestId, kind: "get-quick-info", label: "Reading Quick Info", source: "worker", state };
}

async function update(action: () => void): Promise<void> {
  await act(async () => {
    action();
    await Promise.resolve();
  });
}

function sessionText(container: { querySelector: (selector: string) => { textContent: string | null } | null }): string {
  return container.querySelector(".fobles-work-progress-session")?.textContent ?? "";
}

function taskText(container: { querySelector: (selector: string) => { textContent: string | null } | null }): string {
  return container.querySelector(".fobles-work-progress-task")?.textContent ?? "";
}

void test("pickRelevantWorkProgress prefers active, then foreground, then newest, and falls back to a settled session", () => {
  assert.deepEqual(pickRelevantWorkProgress([]), { primary: undefined, others: 0 });
  const settledOld = snapshot("settled-old", "idle", "background", 1);
  const settledNew = snapshot("settled-new", "idle", "background", 2);
  const settledForeground = snapshot("settled-foreground", "idle", "foreground", 1);
  assert.deepEqual(pickRelevantWorkProgress([settledOld, settledNew]), { primary: settledNew, others: 0 });
  assert.equal(pickRelevantWorkProgress([settledNew, settledForeground]).primary, settledForeground);
  const activeBackground = snapshot("active-background", "active", "background", 0);
  const activeForeground = snapshot("active-foreground", "active", "foreground", 0);
  assert.deepEqual(
    pickRelevantWorkProgress([settledForeground, activeBackground, activeForeground]),
    { primary: activeForeground, others: 1 },
  );
});

void test("workProgressPercent shows settled sessions without work as complete", () => {
  assert.equal(workProgressPercent({ completed: 0, max: 0, status: "idle" }), 100);
  assert.equal(workProgressPercent({ completed: 0, max: 0, status: "active" }), 0);
  assert.equal(workProgressPercent({ completed: 1, max: 4, status: "active" }), 25);
});

void test("toolbar shows the same session as the Worker Monitor, keeps a settled session and keeps its height", async () => {
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
  const defaults = normalizeStructuralSettings(undefined);
  const services: ToolbarDiagnosticsServices = {
    getSettings: () => Promise.resolve(defaults),
    watchSettings: (listener) => {
      settingsListener = listener;
      return () => {
        settingsListener = undefined;
      };
    },
  };
  try {
    assert.equal(defaults.showToolbarDiagnostics, false);
    await update(() => {
      root.render(createElement(ToolbarDiagnostics, { services }));
    });
    assert.equal(container.innerHTML, "");

    await update(() => {
      settingsListener?.({ ...defaults, showToolbarDiagnostics: true });
    });
    assert.equal(sessionText(container), "Idle");
    assert.equal(taskText(container), BLANK_TASK);

    const audit = registerWorkProgress("audit-session", "foreground");
    await update(() => {
      audit.describe({ title: "Auditing", target: "Search" });
      emitActivity(workerActivity("audit-session", "audit-task", "started"));
    });
    assert.match(sessionText(container), /Auditing "Search"/);
    assert.match(sessionText(container), /0 \/ 1/);
    assert.equal(taskText(container), "Reading Quick Info");
    assert.equal(container.querySelector(".fobles-work-progress")?.getAttribute("data-status"), "active");

    await update(() => {
      emitActivity(workerActivity("audit-session", "audit-task", "completed"));
    });
    assert.match(sessionText(container), /Auditing "Search"/);
    assert.match(sessionText(container), /1 \/ 1/);
    assert.equal(taskText(container), "Idle");
    assert.equal(container.querySelector(".fobles-work-progress")?.getAttribute("data-status"), "idle");

    const discovery = registerWorkProgress("discovery-session", "background");
    await update(() => {
      discovery.describe({ title: "Mapping Item Context" });
      emitActivity(workerActivity("discovery-session", "discovery-task", "started"));
    });
    assert.match(sessionText(container), /Mapping Item Context/);
    assert.doesNotMatch(sessionText(container), /more/);

    await update(() => {
      emitActivity(workerActivity("discovery-session", "discovery-task", "completed"));
    });
    assert.match(sessionText(container), /Auditing "Search"/);

    await update(() => {
      discovery.dispose();
      audit.dispose();
    });
    assert.equal(sessionText(container), "Idle");
    assert.equal(taskText(container), BLANK_TASK);
    assert.equal(container.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow"), "0");

    await update(() => {
      settingsListener?.({ ...defaults, showToolbarDiagnostics: false });
    });
    assert.equal(container.innerHTML, "");
  } finally {
    await update(() => {
      root.unmount();
    });
    assert.equal(settingsListener, undefined);
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