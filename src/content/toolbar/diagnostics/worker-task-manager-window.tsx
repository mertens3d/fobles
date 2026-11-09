// @source-path [fobles] src/content/toolbar/diagnostics/worker-task-manager-window.tsx
import { useEffect, useState } from "react";
import { extensionLog } from "../../logger";
import { getWorkerPoolStatus } from "../../foundation/workers/pool/worker-pool-client";
import { PersistedWindow } from "../../shared/ui/persisted-window/persisted-window";
import type { PersistedWindowVisibilityRequest } from "../../shared/ui/persisted-window/persisted-window.types";
import { WorkerTaskManagerPanel } from "./worker-task-manager-panel";

export const WORKER_TASK_MANAGER_TOGGLE_EVENT = "fobles:worker-task-manager-toggle";

export function WorkerTaskManagerWindow() {
  const [visibilityRequest, setVisibilityRequest] = useState<PersistedWindowVisibilityRequest>();
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<Awaited<ReturnType<typeof getWorkerPoolStatus>>>();

  useEffect(() => {
    const toggle = (): void => setVisibilityRequest((current) => ({ id: (current?.id ?? 0) + 1, visible: !visible }));
    window.addEventListener(WORKER_TASK_MANAGER_TOGGLE_EVENT, toggle);
    return () => window.removeEventListener(WORKER_TASK_MANAGER_TOGGLE_EVENT, toggle);
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return undefined;
    }
    let active = true;
    const refresh = (): void => {
      void getWorkerPoolStatus()
        .then((next) => {
          if (!active) {
            return;
          }
          if (next !== undefined) {
            setStatus(next);
          }

        })
        .catch((error: unknown) => {
          extensionLog.error("Worker Task Manager: status request failed", { visible, error });
        });
    };
    refresh();
    const timer = window.setInterval(refresh, 250);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [visible]);

  return <PersistedWindow windowId="worker-task-manager" title="Worker Task Manager" visibilityRequest={visibilityRequest}
    defaultGeometry={{ x: 80, y: 80, width: 760, height: 520 }} minWidth={560} minHeight={260} onVisibilityChange={setVisible}>
    <WorkerTaskManagerPanel status={status} />
  </PersistedWindow>;
}
