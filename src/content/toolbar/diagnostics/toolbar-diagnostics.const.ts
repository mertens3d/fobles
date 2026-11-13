import type { WorkerTaskType } from "../../foundation/workers/tasks/tasks.types";

export const TOOLBAR_DIAGNOSTICS = {
  CLASS: "fobles-toolbar-diagnostics",
  IDLE: "Idle",
  LABEL: "Worker diagnostics",
} as const;

export const DIAGNOSTIC_OPERATION_LABELS: Readonly<Record<WorkerTaskType, string>> = {
  "get-children": "Reading Children",
  "get-custom-fields": "Reading Custom Fields",
  "get-layout": "Reading Layout",
  "get-parent": "Reading Parent",
  "get-quick-info": "Reading Quick Info",
  "get-referrers": "Reading Referrers",
  "get-standard-fields": "Reading Standard Fields",
  "get-template-bases": "Reading Direct Base Templates",
  "set-raw-values": "Setting Raw Values",
  "set-standard-fields": "Setting Standard Fields",
};