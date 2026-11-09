// @source-path [fobles] src/content/toolbar/diagnostics/toolbar-diagnostics.tsx
import { useEffect, useState } from "react";
import { getStructuralSettings, watchStructuralSettings } from "../../../shared/structural/structural-settings";
import { getWorkerPoolStatus } from "../../foundation/workers/pool/worker-pool-client";
import { subscribeActivity } from "../../shared/activity/activity-events";
import { PhaseProgressBar } from "../../shared/ui/reference-controls/phase-progress-bar";
import { DIAGNOSTIC_OPERATION_LABELS, TOOLBAR_DIAGNOSTICS } from "./toolbar-diagnostics.const";
import { observeToolbarDiagnostics } from "./toolbar-diagnostics-subscription";
import type { ToolbarDiagnosticsProps, ToolbarDiagnosticsServices, ToolbarDiagnosticsState } from "./toolbar-diagnostics.types";
import { WORKER_TASK_MANAGER_TOGGLE_EVENT } from "./worker-task-manager-window";

const services: ToolbarDiagnosticsServices = { getSettings: getStructuralSettings, getStatus: getWorkerPoolStatus, subscribe: subscribeActivity, watchSettings: watchStructuralSettings };

export function ToolbarDiagnostics({ services: dependencies = services }: ToolbarDiagnosticsProps) {
  const [state, setState] = useState<ToolbarDiagnosticsState>({ enabled: false });
  useEffect(() => observeToolbarDiagnostics(dependencies, setState), [dependencies]);
  const status = state.status;
  const active = (status?.activeForeground ?? 0) + (status?.activeBackground ?? 0);
  const task = status?.activeTasks.find((entry) => entry.workClass === "foreground") ?? status?.activeTasks[0] ?? status?.queuedTasks[0];
  const operation = task ? DIAGNOSTIC_OPERATION_LABELS[task.type] : TOOLBAR_DIAGNOSTICS.IDLE;
  const queued = (status?.queuedForeground ?? 0) + (status?.queuedBackground ?? 0);
  const total = active + queued;
  const summaryLabel = total > 0 ? operation : "Idle";
  return state.enabled ? <section className={TOOLBAR_DIAGNOSTICS.CLASS} aria-label={TOOLBAR_DIAGNOSTICS.LABEL}>
    <button type="button" className="fobles-toolbar-diagnostics-summary" title={`${active} active · ${queued} queued. Click for Worker Monitor.`}
      onClick={() => window.dispatchEvent(new CustomEvent(WORKER_TASK_MANAGER_TOGGLE_EVENT))}>
      <PhaseProgressBar label={summaryLabel} displayLabel={summaryLabel} progress={{ completed: total > 0 ? Math.max(0, total - queued) : 0, max: total > 0 ? total : 1, status: total > 0 ? "running" : "idle" }} />
    </button>
  </section> : null;
}
