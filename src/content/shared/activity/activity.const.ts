export const ACTIVITY = {
  MESSAGE_TYPE: "FOBLES_ACTIVITY_EVENT",
  WORKER_POOL: {
    ID: "worker-pool-status",
    KIND: "worker-pool-status",
    LABEL: "Worker pool status",
    SOURCE: "worker-pool",
    STATE: "completed",
  },
} as const;

export const ACTIVITY_MESSAGE_TYPE = ACTIVITY.MESSAGE_TYPE;
