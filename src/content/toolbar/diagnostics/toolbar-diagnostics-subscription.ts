import type { ActivityEvent } from "../../shared/activity/activity.types";
import type { WorkerPoolStatus } from "../../foundation/workers/pool/worker-pool-status.types";
import type { ToolbarDiagnosticsServices, ToolbarDiagnosticsState } from "./toolbar-diagnostics.types";

export function observeToolbarDiagnostics(
  services: ToolbarDiagnosticsServices,
  onChange: (state: ToolbarDiagnosticsState) => void,
): () => void {
  let disposed = false;
  let settingsVersion = 0;
  let generation = 0;
  let state: ToolbarDiagnosticsState = { enabled: false };
  let stopActivity: (() => void) | undefined;

  function publish(next: ToolbarDiagnosticsState): void {
    state = next;
    onChange(state);
  }

  function applyEnabled(enabled: boolean): void {
    if (!disposed && enabled !== state.enabled) {
      const currentGeneration = ++generation;
      stopActivity?.();
      stopActivity = undefined;
      publish({ enabled });
      if (enabled) {
        let hostTabId: number | undefined;
        const pending = new Map<number, WorkerPoolStatus>();
        stopActivity = services.subscribe((activity: ActivityEvent) => {
          if (!disposed && generation === currentGeneration) {
            const status = activity.poolStatus;
            if (status && status.requestId === undefined && typeof status.hostTabId === "number") {
              if (hostTabId === undefined) {
                pending.set(status.hostTabId, status);
              } else if (status.hostTabId === hostTabId) {
                publish({ enabled: true, status });
              }
            } else if (!status && state.status?.activeTasks.some((task) =>
              task.requestId === activity.requestId && task.taskId === activity.activityId)) {
              publish({ ...state, activity });
            }
          }
        });
        void services.getStatus().then((status) => {
          if (!disposed && generation === currentGeneration && typeof status?.hostTabId === "number" &&
            status.requestId === undefined) {
            hostTabId = status.hostTabId;
            publish({ enabled: true, status: pending.get(hostTabId) ?? status });
          }
          pending.clear();
        }).catch(() => pending.clear());
      }
    }
  }

  const stopSettings = services.watchSettings((settings) => {
    settingsVersion++;
    applyEnabled(settings.showToolbarDiagnostics === true);
  });
  const initialVersion = settingsVersion;
  void services.getSettings().then((settings) => {
    if (settingsVersion === initialVersion) {
      applyEnabled(settings.showToolbarDiagnostics === true);
    }
  }).catch(() => undefined);

  return () => {
    disposed = true;
    generation++;
    stopActivity?.();
    stopSettings();
  };
}