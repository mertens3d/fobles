// @source-path [fobles] src/content/toolbar/diagnostics/worker-monitor.const.ts

import type { WorkerMonitorColumn } from "./worker-monitor-row.types";

// Agent: Shown in any cell whose value does not apply to the row (e.g. Outcome on a live worker, URL on history).
export const WORKER_MONITOR_EMPTY_CELL = "\u2014";

// Agent: The single column set for Worker State and Work Session History. Order: Time, Worker, State, then scale
// Agent: (Session, Task, Item Name), then the rest. The stylesheet's nth-child widths follow this order.
export const WORKER_MONITOR_COLUMNS: readonly WorkerMonitorColumn[] = [
  { key: "time", label: "Time", help: "Latest activity time of the task." },
  { key: "worker", label: "Worker", help: "Pool worker (iframe or tab) running the task.", titleKey: "workerTitle" },
  { key: "state", label: "State", help: "Live worker state. Blank on history rows." },
  { key: "session", label: "Session", help: "Work session (Auditor, Graph or item context) the task belongs to." },
  { key: "task", label: "Task", help: "Worker operation." },
  { key: "itemName", label: "Item Name", help: "Sitecore item name when known." },
  { key: "target", label: "Target", help: "Requested item id, path or URL.", titleKey: "targetTitle" },
  { key: "workClass", label: "Class", help: "FG is foreground work; BG is background work.", titleKey: "workClassTitle" },
  { key: "phase", label: "Phase", help: "Latest lifecycle phase." },
  { key: "outcome", label: "Outcome", help: "Final result. Blank while the task is still running." },
  { key: "recoveries", label: "Recoveries", help: "Worker recovery attempts made for this task.", titleKey: "recoveriesTitle" },
  { key: "noProgress", label: "No Progress", help: "Time since the worker last reported progress. Blank on history rows." },
  { key: "url", label: "URL", help: "Document currently loaded in the worker. Blank on history rows." },
];
