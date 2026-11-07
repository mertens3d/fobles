import { SITECORE } from "../../../src/constants/sitecore.ts";
import { getRuntimeSettings } from "../../../src/content/runtime-settings/runtime-settings.ts";
import { factoryItemGraphNodeData, type ItemGraphNodeData } from "../../../src/content/foundation/reference-data/model/sitecore-item.types.ts";
import type { WorkClass } from "../../../src/content/foundation/workers/work-scheduling.types.ts";
import type { WorkSession, WorkSessionTask } from "../../../src/content/foundation/workers/session/work-session.types.ts";
import type { WorkerTaskResult } from "../../../src/content/foundation/workers/tasks/worker-task.types.ts";
import { normalizeStructuralSettings } from "../../../src/shared/structural/structural-settings.ts";
import { guid, SCOPE } from "./structural-fixture.ts";

export function runtimeFixture() {
  getRuntimeSettings().structuralCache.maxUnvalidatedAgeHours = 1;
  let now = Date.now();
  let baseIds: readonly string[] | undefined = [guid(2)];
  let found = true;
  let completed = 0;
  let cancelled = 0;
  let fallbackCalls = 0;
  const classes: WorkClass[] = [];
  const tasks: WorkSessionTask[] = [];
  const template = factoryItemGraphNodeData({ scItemId: guid(10), scItemName: "Custom", scItemPath: `${SITECORE.ITEM_KIND.PATH_ROOTS.TEMPLATES}/Custom` });
  const parent = factoryItemGraphNodeData({ scItemId: guid(20), scItemName: "Site", scItemPath: `${SITECORE.ITEM_KIND.PATH_ROOTS.CONTENT}/Site` });
  const item = factoryItemGraphNodeData({ scItemId: guid(21), scItemName: "Home", scItemPath: `${parent.scItemPath}/Home`, scTemplate: template });
  let parentFact: ItemGraphNodeData | undefined = parent;
  const unavailablePaths = new Set<string>();
  const createSession = (workClass: WorkClass): WorkSession => {
    classes.push(workClass);
    return {
      workClass,
      runTask: (task: WorkSessionTask): Promise<WorkerTaskResult | undefined> => {
        tasks.push(task);
        const base = { requestId: "background-test", taskId: task.taskId, status: "success" as const };
        let result: WorkerTaskResult | undefined;
        if (task.type === "get-quick-info") {
          const value = task.requested.value === parent.scItemPath || task.requested.value === parent.scItemId ? parent
            : task.requested.value === guid(10) || task.requested.kind === "path" ? template : item;
          if (!unavailablePaths.has(task.requested.value)) {
            result = { ...base, type: task.type, payload: { result: found
              ? { requested: task.requested, status: "found", value, resolved: { itemId: value.scItemId!, path: value.scItemPath } }
              : { requested: task.requested, status: "not-found" } } };
          }
        } else if (task.type === "get-parent") {
          result = { ...base, type: task.type, payload: { parent: parentFact } };
        } else if (task.type === "get-template-bases") {
          result = { ...base, type: task.type, payload: { inheritedTemplateIds: baseIds } };
        }
        return Promise.resolve(result);
      },
      cancel: () => { cancelled += 1; return Promise.resolve(); },
      complete: () => { completed += 1; return Promise.resolve(); },
    } as WorkSession;
  };
  const options = {
    identity: { environment: SCOPE.origin, database: SCOPE.database, language: "en" },
    origin: SCOPE.origin, settings: normalizeStructuralSettings(undefined), createSession,
    now: () => now,
    templateBasesFallback: (): Promise<WorkerTaskResult | undefined> => { fallbackCalls += 1; return Promise.resolve(undefined); },
  };
  return {
    options, tasks, classes, template, item, parent, unavailablePaths,
    setParent: (value: ItemGraphNodeData | undefined) => { parentFact = value; },
    age: () => { now += 60 * 60 * 1000 + 1; },
    now: () => now,
    setBases: (ids: readonly string[] | undefined) => { baseIds = ids; },
    missing: () => { found = false; },
    completed: () => completed,
    cancelled: () => cancelled,
    fallbackCalls: () => fallbackCalls,
  };
}
