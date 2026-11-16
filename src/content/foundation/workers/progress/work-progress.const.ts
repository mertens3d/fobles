// @source-path [fobles] src/content/foundation/workers/progress/work-progress.const.ts

export const WORK_PROGRESS = {
  DEFAULT_TITLE: {
    background: "Discovering structure",
    foreground: "Working",
  },
  LINK_HARVEST_FINISHED: "link-harvest-finished",
  PHASE: {
    ACQUIRE: "acquire",
    HARVEST: "harvest",
    LINK_HARVEST: "link-harvest",
    VALIDATE: "validate",
  },
  RECENT_LABEL_LIMIT: 200,
  SETTLED_TASK_STATES: ["cancelled", "completed", "error"],
  TITLE: {
    AUDIT: "Auditing",
    GRAPH: "Graphing",
    STRUCTURE: "Mapping Site Structure",
  },
} as const;
