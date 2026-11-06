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

  return state.enabled ? (
    <section className={TOOLBAR_DIAGNOSTICS.CLASS} aria-label={TOOLBAR_DIAGNOSTICS.LABEL}>
      <PhaseProgressBar label={TOOLBAR_DIAGNOSTICS.LABEL}
        displayLabel={`Active ${active}/${status?.maxWorkers ?? 0} · Capacity ${status?.capacity ?? 0} · FG ${status?.activeForeground ?? 0} active/${status?.queuedForeground ?? 0} queued · BG ${status?.activeBackground ?? 0} active/${status?.queuedBackground ?? 0} queued`}
        progress={{ completed: active, max: status?.maxWorkers ?? 0, status: active > 0 ? "running" : "idle" }} />
      <div className="fobles-toolbar-diagnostics-current" title={current}>{current}</div>
      {activity?.detail && <div className="fobles-toolbar-diagnostics-current" title={activity.detail}>{activity.detail}</div>}
    </section>
  ) : null;
}