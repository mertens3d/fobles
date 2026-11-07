import { useEffect, useState } from "react";
import { getStructuralSettings, watchStructuralSettings } from "../../../shared/structural/structural-settings";
import { getWorkerPoolStatus } from "../../foundation/workers/pool/worker-pool-client";
import { subscribeActivity } from "../../shared/activity/activity-events";
import { PhaseProgressBar } from "../../shared/ui/reference-controls/phase-progress-bar";
import { DIAGNOSTIC_OPERATION_LABELS, TOOLBAR_DIAGNOSTICS } from "./toolbar-diagnostics.const";
import { observeToolbarDiagnostics } from "./toolbar-diagnostics-subscription";
import type { ToolbarDiagnosticsProps, ToolbarDiagnosticsServices, ToolbarDiagnosticsState } from "./toolbar-diagnostics.types";

const services: ToolbarDiagnosticsServices = {
  getSettings: getStructuralSettings,
  getStatus: getWorkerPoolStatus,
  subscribe: subscribeActivity,
  watchSettings: watchStructuralSettings,
};

export function ToolbarDiagnostics({ services: dependencies = services }: ToolbarDiagnosticsProps) {
  const [expanded, setExpanded] = useState(false);
  const [state, setState] = useState<ToolbarDiagnosticsState>({ enabled: false });
  useEffect(() => observeToolbarDiagnostics(dependencies, setState), [dependencies]);
  const status = state.status;
  const active = (status?.activeForeground ?? 0) + (status?.activeBackground ?? 0);
  const task = status?.activeTasks.find((entry) => entry.workClass === "foreground") ??
    status?.activeTasks[0] ?? status?.queuedTasks[0];
  const activity = task && state.activity?.activityId === task.taskId && state.activity.requestId === task.requestId
    ? state.activity : undefined;
  const operation = task ? DIAGNOSTIC_OPERATION_LABELS[task.type] : TOOLBAR_DIAGNOSTICS.IDLE;
  const current = task ? `${operation} · ${task.item?.value ?? task.url} · ${task.phase}` : operation;

  const queued = (status?.queuedForeground ?? 0) + (status?.queuedBackground ?? 0);
  const total = active + queued;
  const foreground = (status?.activeForeground ?? 0) + (status?.queuedForeground ?? 0);
  const background = (status?.activeBackground ?? 0) + (status?.queuedBackground ?? 0);

  const progressStatus = total > 0 ? "running" : "idle";
  const summaryLabel = total > 0 ? operation : "Idle";

  return state.enabled ? (
    <section className={`${TOOLBAR_DIAGNOSTICS.CLASS}${expanded ? " is-expanded" : ""}`} aria-label={TOOLBAR_DIAGNOSTICS.LABEL}>
      <button type="button" className="fobles-toolbar-diagnostics-summary" aria-expanded={expanded}
        title={`${active} active · ${queued} queued. Click for details.`} onClick={() => setExpanded((value) => !value)}>
        <PhaseProgressBar label={summaryLabel} displayLabel={summaryLabel}
          progress={{ completed: total > 0 ? Math.max(0, total - queued) : 0, max: total > 0 ? total : 1, status: progressStatus }} />
      </button>
      {expanded && <div className="fobles-toolbar-diagnostics-details">
        <div>{active} active · {queued} queued · {status?.capacity ?? 0} worker capacity</div>
        {foreground > 0 && <div>Foreground: {status?.activeForeground ?? 0} active · {status?.queuedForeground ?? 0} queued</div>}
        {background > 0 && <div>Background: {status?.activeBackground ?? 0} active · {status?.queuedBackground ?? 0} queued</div>}
        <div className="fobles-toolbar-diagnostics-current" title={current}>{current}</div>
        {activity?.detail && <div className="fobles-toolbar-diagnostics-current" title={activity.detail}>{activity.detail}</div>}
      </div>}
    </section>
  ) : null;
}