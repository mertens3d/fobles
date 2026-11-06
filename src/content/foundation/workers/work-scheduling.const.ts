export const WORK_SCHEDULING = {
  BACKGROUND: "background",
  FOREGROUND: "foreground",
  MAX_BACKGROUND_ACTIVE: 1,
  PHASE: {
    EXECUTING: "executing",
    QUEUED: "queued",
    RETRYING: "retrying",
    STARTING: "starting",
  },
} as const;