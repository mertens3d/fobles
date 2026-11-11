

export type WorkerIframeEmergencyCleanupResult = {
  containerFound: boolean;
  trackedCountBefore: number;
  orphanCountBefore: number;
  workerIds: string[];
  iframeSrcs: string[];
  orphanCountAfter: number;
  trackedCountAfter: number;
  containerExistsAfter: boolean;
};

export type WorkerIframeTarget = { kind: "iframe"; workerId: string; hostTabId: number; frameId: number };

export type PendingWorkerReady = {
  hostTabId: number;
  resolve: (target: WorkerIframeTarget) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};
